<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Payload;
use App\Entity\User;
use App\Repository\TeamRepository;
use App\Service\TeamMembershipService;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access rules for Payload (Cyber Toolbox). Mirrors ConceptVoter:
 *
 * - VIEW: owner, or visibility=public (guests allowed), or (visibility=team
 *   and user is member of any shared team).
 * - EDIT/DELETE: owner only (plus admin on PUBLIC payloads). Team leads have
 *   NO edit/delete authority over team-shared content — confirmed owner-only.
 * - CREATE: any authenticated ROLE_USER.
 * - UNSHARE_FROM_TEAM:<teamId>: owner, or lead of the named team. Team must
 *   actually be in payload.sharedTeams.
 *
 * Admins have NO access to private/team payloads, not even VIEW — same
 * "admin moderates public content only" rule as Dev Library.
 */
final class PayloadVoter extends Voter
{
    public const VIEW = 'PAYLOAD_VIEW';
    public const EDIT = 'PAYLOAD_EDIT';
    public const DELETE = 'PAYLOAD_DELETE';
    public const CREATE = 'PAYLOAD_CREATE';
    public const UNSHARE_FROM_TEAM = 'PAYLOAD_UNSHARE_FROM_TEAM';

    public function __construct(
        private readonly TeamMembershipService $memberships,
        private readonly TeamRepository $teamRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        if ($attribute === self::CREATE) {
            return true;
        }

        if (str_starts_with($attribute, self::UNSHARE_FROM_TEAM)) {
            return $subject instanceof Payload;
        }

        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Payload;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        if ($attribute === self::CREATE) {
            $user = $token->getUser();

            return $user instanceof User;
        }

        /** @var Payload $payload */
        $payload = $subject;
        $user = $token->getUser();

        if (str_starts_with($attribute, self::UNSHARE_FROM_TEAM)) {
            return $this->canUnshareFromTeam($payload, $user, $attribute);
        }

        return match ($attribute) {
            self::VIEW => $this->canView($payload, $user),
            self::EDIT => $this->canEdit($payload, $user),
            self::DELETE => $this->canDelete($payload, $user),
            default => false,
        };
    }

    private function canView(Payload $payload, mixed $user): bool
    {
        // Public payloads are visible to everyone (including guests)
        if ($payload->getVisibility() === 'public') {
            return true;
        }

        if (!$user instanceof User) {
            return false;
        }

        // Owner can always view
        if ($this->isOwner($payload, $user)) {
            return true;
        }

        // Team visibility: member of any shared team
        if ($payload->getVisibility() === 'team') {
            return $this->memberships->isMemberOfAnySharedTeam($user, $payload->getSharedTeams());
        }

        return false;
    }

    private function canEdit(Payload $payload, mixed $user): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        if ($this->isOwner($payload, $user)) {
            return true;
        }

        // Admins moderate public content only — never private/team.
        // Team leads have NO edit power (owner-only).
        return $this->isAdmin($user) && $payload->getVisibility() === 'public';
    }

    private function canDelete(Payload $payload, mixed $user): bool
    {
        return $this->canEdit($payload, $user);
    }

    private function canUnshareFromTeam(Payload $payload, mixed $user, string $attribute): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        $parts = explode(':', $attribute, 2);
        if (count($parts) !== 2 || $parts[1] === '') {
            return false;
        }
        $teamId = $parts[1];

        $team = $this->teamRepository->findOneById($teamId);
        if ($team === null) {
            return false;
        }

        if (!$payload->isSharedWithTeam($team)) {
            return false;
        }

        if ($this->isOwner($payload, $user)) {
            return true;
        }

        return $this->memberships->isLead($user, $team);
    }

    private function isOwner(Payload $payload, User $user): bool
    {
        return $payload->getOwner()->getId()?->equals($user->getId()) ?? false;
    }

    private function isAdmin(User $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }
}
