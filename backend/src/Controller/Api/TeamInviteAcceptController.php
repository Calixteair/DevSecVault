<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\TeamMember;
use App\Entity\User;
use App\Repository\TeamInviteLinkRepository;
use App\Repository\TeamMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Serializer\SerializerInterface;
use Symfony\Component\Uid\Uuid;

/**
 * Accept a team invite link.
 *
 * Lives outside /api/teams/{id}/* because the accepting user only knows the
 * invite token, not the target team id. Requires ROLE_USER (handled by the
 * firewall's catch-all rule).
 */
final class TeamInviteAcceptController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly TeamInviteLinkRepository $inviteRepository,
        private readonly TeamMemberRepository $teamMemberRepository,
        private readonly SerializerInterface $serializer,
    ) {
    }

    #[Route('/api/team-invites/accept', name: 'api_team_invites_accept', methods: ['POST'])]
    public function accept(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $this->getUser();

        $data = $this->decodeJson($request);
        if ($data instanceof JsonResponse) {
            return $data;
        }

        $token = isset($data['token']) && is_string($data['token']) ? trim($data['token']) : '';
        if ($token === '' || !Uuid::isValid($token)) {
            return $this->json(
                ['error' => 'Invite link is invalid, expired, or disabled.'],
                Response::HTTP_NOT_FOUND,
            );
        }

        $invite = $this->inviteRepository->findUsableByToken($token);
        if ($invite === null) {
            return $this->json(
                ['error' => 'Invite link is invalid, expired, or disabled.'],
                Response::HTTP_NOT_FOUND,
            );
        }

        $team = $invite->getTeam();

        if ($this->teamMemberRepository->findOneByTeamAndUser($team, $user) !== null) {
            return $this->json(
                ['error' => 'You are already a member of this team.'],
                Response::HTTP_CONFLICT,
            );
        }

        if ($this->teamMemberRepository->countByUser($user) >= TeamController::MAX_TEAMS_PER_USER) {
            return $this->json(
                ['error' => sprintf('You have reached the maximum number of teams (%d).', TeamController::MAX_TEAMS_PER_USER)],
                Response::HTTP_CONFLICT,
            );
        }

        if ($team->getMemberCount() >= TeamController::MAX_MEMBERS_PER_TEAM) {
            return $this->json(
                ['error' => sprintf('Team is full (%d members max).', TeamController::MAX_MEMBERS_PER_TEAM)],
                Response::HTTP_CONFLICT,
            );
        }

        $member = new TeamMember();
        $member->setTeam($team);
        $member->setUser($user);
        $member->setRole(TeamMember::ROLE_MEMBER);

        $this->entityManager->persist($member);
        $this->entityManager->flush();

        return $this->json([
            'team' => $this->serializer->normalize($team, 'json', ['groups' => ['team:read']]),
        ]);
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
}
