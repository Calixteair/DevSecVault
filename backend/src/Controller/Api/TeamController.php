<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\Concept;
use App\Entity\Payload;
use App\Entity\Team;
use App\Entity\TeamMember;
use App\Entity\User;
use App\Repository\ConceptRepository;
use App\Repository\PayloadRepository;
use App\Repository\TeamMemberRepository;
use App\Repository\TeamRepository;
use App\Security\Voter\TeamVoter;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * REST API for Teams (Phase 6).
 *
 * Caps:
 *  - MAX_TEAMS_PER_USER: a user may belong to at most 10 teams.
 *  - MAX_MEMBERS_PER_TEAM: a team may hold at most 5 members (lead included).
 *
 * The "lead" role is sourced from TeamMember.role (not Team.owner). Team.owner
 * remains the original creator for audit; lead can be transferred independently.
 */
#[Route('/api/teams', name: 'api_teams_')]
final class TeamController extends AbstractController
{
    public const MAX_TEAMS_PER_USER = 10;
    public const MAX_MEMBERS_PER_TEAM = 5;

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TeamRepository $teamRepository,
        private readonly TeamMemberRepository $teamMemberRepository,
        private readonly ConceptRepository $conceptRepository,
        private readonly PayloadRepository $payloadRepository,
        private readonly SerializerInterface $serializer,
        private readonly ValidatorInterface $validator,
        private readonly Security $security,
    ) {
    }

    /**
     * POST /api/teams — create a new team. The current user becomes the lead.
     */
    #[Route('', name: 'create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        if ($this->teamMemberRepository->countByUser($user) >= self::MAX_TEAMS_PER_USER) {
            return $this->json(
                ['error' => sprintf('You have reached the maximum number of teams (%d).', self::MAX_TEAMS_PER_USER)],
                Response::HTTP_CONFLICT,
            );
        }

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $name = isset($data['name']) && is_string($data['name']) ? trim($data['name']) : '';

        $team = new Team();
        $team->setOwner($user);
        $team->setName($name);

        $errors = $this->validator->validate($team);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $member = new TeamMember();
        $member->setTeam($team);
        $member->setUser($user);
        $member->setRole(TeamMember::ROLE_LEAD);

        $this->entityManager->persist($team);
        $this->entityManager->persist($member);
        $this->entityManager->flush();

        return $this->json($this->serializeTeamWithRole($team, $user, 'team:read'), Response::HTTP_CREATED);
    }

    /**
     * GET /api/teams — list the caller's teams (each with their role).
     */
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $teams = $this->teamMemberRepository->findTeamsForUser($user);

        $out = [];
        foreach ($teams as $team) {
            $out[] = $this->serializeTeamWithRole($team, $user, 'team:list');
        }

        return $this->json($out);
    }

    /**
     * GET /api/teams/{id} — team detail with members.
     */
    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(string $id): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::VIEW, $team);

        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->serializeTeamWithRole($team, $user, 'team:read'));
    }

    /**
     * PATCH /api/teams/{id} — rename (lead only).
     */
    #[Route('/{id}', name: 'update', methods: ['PATCH'])]
    public function update(string $id, Request $request): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        if (!array_key_exists('name', $data) || !is_string($data['name'])) {
            return $this->json(['error' => 'name is required.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $team->setName(trim($data['name']));

        $errors = $this->validator->validate($team);
        if (count($errors) > 0) {
            return $this->validationErrorResponse($errors);
        }

        $this->entityManager->flush();

        /** @var User $user */
        $user = $this->getUser();

        return $this->json($this->serializeTeamWithRole($team, $user, 'team:read'));
    }

    /**
     * DELETE /api/teams/{id} — disband team (lead only).
     * Cleans up shared resources first (flip to private if no other teams share it).
     */
    #[Route('/{id}', name: 'delete', methods: ['DELETE'])]
    public function delete(string $id): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $this->cleanupTeamShares($team);

        // Flush share cleanup BEFORE deleting the team so ORM can re-index and
        // the M2M rows are managed cleanly.
        $this->entityManager->flush();

        $this->entityManager->remove($team);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * POST /api/teams/{id}/leave — leave the team.
     * Lead may leave only if they are the last member (auto-disbands the team).
     */
    #[Route('/{id}/leave', name: 'leave', methods: ['POST'])]
    public function leave(string $id): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::LEAVE, $team);

        /** @var User $user */
        $user = $this->getUser();

        $membership = $this->teamMemberRepository->findOneByTeamAndUser($team, $user);
        if ($membership === null) {
            return $this->json(['error' => 'You are not a member of this team.'], Response::HTTP_NOT_FOUND);
        }

        if ($membership->isLead()) {
            if ($team->getMemberCount() <= 1) {
                // Sole lead — auto-disband the team.
                $this->cleanupTeamShares($team);
                $this->entityManager->flush();

                $this->entityManager->remove($team);
                $this->entityManager->flush();

                return $this->json(null, Response::HTTP_NO_CONTENT);
            }

            return $this->json(
                ['error' => 'You must transfer leadership or delete the team before leaving.'],
                Response::HTTP_CONFLICT,
            );
        }

        // Regular member leave: strip their own resources from the team shares.
        $this->unshareUserResourcesFromTeam($user, $team);

        $this->entityManager->remove($membership);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * POST /api/teams/{id}/transfer-lead — transfer leadership (lead only).
     * Body: { userId: "<uuid>" } — target must be an existing member.
     */
    #[Route('/{id}/transfer-lead', name: 'transfer_lead', methods: ['POST'])]
    public function transferLead(string $id, Request $request): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $targetUserId = isset($data['userId']) && is_string($data['userId']) ? $data['userId'] : '';
        if ($targetUserId === '' || !Uuid::isValid($targetUserId)) {
            return $this->json(['error' => 'userId is required and must be a UUID.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var User $user */
        $user = $this->getUser();

        if ($user->getId()?->toRfc4122() === (string) Uuid::fromString($targetUserId)) {
            return $this->json(['error' => 'You are already the lead.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Locate target membership.
        $targetMembership = null;
        foreach ($team->getMembers() as $m) {
            if ($m->getUser()->getId()?->toRfc4122() === (string) Uuid::fromString($targetUserId)) {
                $targetMembership = $m;
                break;
            }
        }

        if ($targetMembership === null) {
            return $this->json(['error' => 'Target user is not a member of this team.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $currentMembership = $this->teamMemberRepository->findOneByTeamAndUser($team, $user);
        if ($currentMembership === null) {
            return $this->json(['error' => 'You are not a member of this team.'], Response::HTTP_CONFLICT);
        }

        $currentMembership->setRole(TeamMember::ROLE_MEMBER);
        $targetMembership->setRole(TeamMember::ROLE_LEAD);

        $this->entityManager->flush();

        return $this->json($this->serializeTeamWithRole($team, $user, 'team:read'));
    }

    /**
     * DELETE /api/teams/{id}/members/{userId} — kick a member (lead only).
     */
    #[Route('/{id}/members/{userId}', name: 'kick_member', methods: ['DELETE'])]
    public function kickMember(string $id, string $userId): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::MANAGE, $team);

        if (!Uuid::isValid($userId)) {
            return $this->json(['error' => 'Invalid userId.'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        /** @var User $user */
        $user = $this->getUser();

        if ($user->getId()?->toRfc4122() === (string) Uuid::fromString($userId)) {
            return $this->json(
                ['error' => 'Cannot kick yourself. Use /leave instead.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $targetMembership = null;
        foreach ($team->getMembers() as $m) {
            if ($m->getUser()->getId()?->toRfc4122() === (string) Uuid::fromString($userId)) {
                $targetMembership = $m;
                break;
            }
        }

        if ($targetMembership === null) {
            return $this->json(['error' => 'Member not found.'], Response::HTTP_NOT_FOUND);
        }

        if ($targetMembership->isLead()) {
            // Defensive: a lead shouldn't be kicked. Transfer or disband first.
            return $this->json(
                ['error' => 'Cannot kick the team lead. Transfer leadership first.'],
                Response::HTTP_UNPROCESSABLE_ENTITY,
            );
        }

        $this->unshareUserResourcesFromTeam($targetMembership->getUser(), $team);

        $this->entityManager->remove($targetMembership);
        $this->entityManager->flush();

        return $this->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * GET /api/teams/{id}/resources — list concepts + payloads shared with the team.
     *
     * Accessible to any team member (lead or member). Members need to see what's
     * shared in their team; the lead-only capability is un-sharing individual
     * resources, which is handled on the resource endpoints (not here).
     */
    #[Route('/{id}/resources', name: 'resources', methods: ['GET'])]
    public function resources(string $id): JsonResponse
    {
        $team = $this->loadTeam($id);
        if ($team === null) {
            return $this->json(['error' => 'Team not found.'], Response::HTTP_NOT_FOUND);
        }

        $this->denyAccessUnlessGranted(TeamVoter::VIEW, $team);

        $concepts = $this->serializer->normalize($team->getSharedConcepts()->toArray(), 'json', ['groups' => ['concept:list']]);
        $payloads = $this->serializer->normalize($team->getSharedPayloads()->toArray(), 'json', ['groups' => ['payload:list']]);

        return $this->json([
            'concepts' => $concepts,
            'payloads' => $payloads,
        ]);
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private function loadTeam(string $id): ?Team
    {
        if (!Uuid::isValid($id)) {
            return null;
        }

        return $this->teamRepository->findOneById($id);
    }

    /**
     * Strips every Concept and Payload currently shared with $team of the
     * share. If the resource's `sharedTeams` collection becomes empty AND
     * visibility was 'team', visibility is flipped back to 'private'.
     *
     * Does NOT flush — caller is responsible.
     */
    private function cleanupTeamShares(Team $team): void
    {
        foreach ($team->getSharedConcepts()->toArray() as $concept) {
            /** @var Concept $concept */
            $concept->removeSharedTeam($team);
            if ($concept->getSharedTeams()->isEmpty() && $concept->getVisibility() === 'team') {
                $concept->setVisibility('private');
            }
        }

        foreach ($team->getSharedPayloads()->toArray() as $payload) {
            /** @var Payload $payload */
            $payload->removeSharedTeam($team);
            if ($payload->getSharedTeams()->isEmpty() && $payload->getVisibility() === 'team') {
                $payload->setVisibility('private');
            }
        }
    }

    /**
     * Un-shares the given user's own resources from the given team. Used when
     * a member leaves or is kicked — their resources no longer circulate in
     * the team, but are preserved as private.
     */
    private function unshareUserResourcesFromTeam(User $user, Team $team): void
    {
        $concepts = $this->conceptRepository->findByOwner($user);
        foreach ($concepts as $concept) {
            if ($concept->isSharedWithTeam($team)) {
                $concept->removeSharedTeam($team);
                if ($concept->getSharedTeams()->isEmpty() && $concept->getVisibility() === 'team') {
                    $concept->setVisibility('private');
                }
            }
        }

        $payloads = $this->payloadRepository->findByOwner($user);
        foreach ($payloads as $payload) {
            if ($payload->isSharedWithTeam($team)) {
                $payload->removeSharedTeam($team);
                if ($payload->getSharedTeams()->isEmpty() && $payload->getVisibility() === 'team') {
                    $payload->setVisibility('private');
                }
            }
        }
    }

    /**
     * Serialize a team and append the caller's role (`lead`/`member`/`null`)
     * so the frontend can drive conditional UI without a second round-trip.
     *
     * @return array<string, mixed>
     */
    private function serializeTeamWithRole(Team $team, User $user, string $group): array
    {
        $data = $this->serializer->normalize($team, 'json', ['groups' => [$group]]);

        $membership = $this->teamMemberRepository->findOneByTeamAndUser($team, $user);
        $data['role'] = $membership?->getRole();

        return $data;
    }

    private function decodeJson(Request $request): array|JsonResponse
    {
        $content = $request->getContent();
        if ($content === '') {
            return $this->json(['error' => 'Request body is empty.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $data = json_decode($content, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException) {
            return $this->json(['error' => 'Invalid JSON.'], Response::HTTP_BAD_REQUEST);
        }

        if (!is_array($data)) {
            return $this->json(['error' => 'Request body must be a JSON object.'], Response::HTTP_BAD_REQUEST);
        }

        return $data;
    }

    private function validationErrorResponse(mixed $errors): JsonResponse
    {
        $messages = [];
        foreach ($errors as $error) {
            $messages[] = [
                'property' => $error->getPropertyPath(),
                'message' => $error->getMessage(),
            ];
        }

        return $this->json(['errors' => $messages], Response::HTTP_UNPROCESSABLE_ENTITY);
    }
}
