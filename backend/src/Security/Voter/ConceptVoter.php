<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Concept;
use App\Entity\User;
use App\Repository\TeamRepository;
use App\Service\TeamMembershipService;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Determines access to Concept entities based on ownership and visibility.
 *
 * - VIEW: owner, or visibility=public, or (visibility=team and user is member of any shared team)
 * - EDIT/DELETE: owner only (plus admin on PUBLIC concepts). A team lead has
 *   NO edit/delete authority over team-shared content — lead power is limited
 *   to removing their own team from sharedTeams (UNSHARE_FROM_TEAM).
 * - CREATE: any authenticated user with ROLE_USER
 * - UNSHARE_FROM_TEAM:<teamId>: owner of the concept, or lead of the named team.
 *   The team must actually be in concept.sharedTeams; otherwise denied.
 */
final class ConceptVoter extends Voter
{
    public const VIEW = 'CONCEPT_VIEW';
    public const EDIT = 'CONCEPT_EDIT';
    public const DELETE = 'CONCEPT_DELETE';
    public const CREATE = 'CONCEPT_CREATE';
    public const UNSHARE_FROM_TEAM = 'CONCEPT_UNSHARE_FROM_TEAM';

    public function __construct(
        private readonly TeamMembershipService $memberships,
        private readonly TeamRepository $teamRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        // CREATE doesn't require a subject
        if ($attribute === self::CREATE) {
            return true;
        }

        // UNSHARE_FROM_TEAM is encoded as "CONCEPT_UNSHARE_FROM_TEAM:<teamId>"
        // because Symfony Voter signatures only carry (attribute, subject).
        if (str_starts_with($attribute, self::UNSHARE_FROM_TEAM)) {
            return $subject instanceof Concept;
        }

        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof Concept;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        // CREATE: any authenticated ROLE_USER can create
        if ($attribute === self::CREATE) {
            $user = $token->getUser();

            return $user instanceof User;
        }

        /** @var Concept $concept */
        $concept = $subject;
        $user = $token->getUser();

        if (str_starts_with($attribute, self::UNSHARE_FROM_TEAM)) {
            return $this->canUnshareFromTeam($concept, $user, $attribute);
        }

        return match ($attribute) {
            self::VIEW => $this->canView($concept, $user),
            self::EDIT => $this->canEdit($concept, $user),
            self::DELETE => $this->canDelete($concept, $user),
            default => false,
        };
    }

    private function canView(Concept $concept, mixed $user): bool
    {
        // Public concepts are visible to everyone (including guests)
        if ($concept->getVisibility() === 'public') {
            return true;
        }

        // Non-public concepts require an authenticated user
        if (!$user instanceof User) {
            return false;
        }

        // Owner can always view
        if ($this->isOwner($concept, $user)) {
            return true;
        }

        // Team visibility: member of ANY team the concept is shared with
        if ($concept->getVisibility() === 'team') {
            return $this->memberships->isMemberOfAnySharedTeam($user, $concept->getSharedTeams());
        }

        return false;
    }

    private function canEdit(Concept $concept, mixed $user): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        if ($this->isOwner($concept, $user)) {
            return true;
        }

        // Admins can moderate public content only — never private/team.
        // Team leads have NO edit power — confirmed owner-only rule.
        return $this->isAdmin($user) && $concept->getVisibility() === 'public';
    }

    private function canDelete(Concept $concept, mixed $user): bool
    {
        // Same rules as edit — owner or (admin && public). No lead override.
        return $this->canEdit($concept, $user);
    }

    private function canUnshareFromTeam(Concept $concept, mixed $user, string $attribute): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        // Parse teamId from "CONCEPT_UNSHARE_FROM_TEAM:<uuid>"
        $parts = explode(':', $attribute, 2);
        if (count($parts) !== 2 || $parts[1] === '') {
            return false;
        }
        $teamId = $parts[1];

        $team = $this->teamRepository->findOneById($teamId);
        if ($team === null) {
            return false;
        }

        // The team must actually be shared with this concept
        if (!$concept->isSharedWithTeam($team)) {
            return false;
        }

        // Owner can always unshare
        if ($this->isOwner($concept, $user)) {
            return true;
        }

        // Lead of the named team can revoke the share
        return $this->memberships->isLead($user, $team);
    }

    private function isOwner(Concept $concept, User $user): bool
    {
        return $concept->getOwner()->getId()?->equals($user->getId()) ?? false;
    }

    private function isAdmin(User $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }
}
