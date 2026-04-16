<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Concept;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Determines access to Concept entities based on ownership and visibility.
 *
 * - VIEW: owner, or visibility=public, or (visibility=team and user is team member — team check deferred to Phase 6)
 * - EDIT/DELETE: the owner, or an admin (admin only on PUBLIC concepts — never on private content per CC.md)
 * - CREATE: any authenticated user with ROLE_USER
 */
final class ConceptVoter extends Voter
{
    public const VIEW = 'CONCEPT_VIEW';
    public const EDIT = 'CONCEPT_EDIT';
    public const DELETE = 'CONCEPT_DELETE';
    public const CREATE = 'CONCEPT_CREATE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        // CREATE doesn't require a subject
        if ($attribute === self::CREATE) {
            return true;
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

        // Team visibility — for now, only check ownership (team member check deferred to Phase 6)
        if ($concept->getVisibility() === 'team') {
            return false; // TODO: check team membership in Phase 6
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

        // Admins can moderate public content only — never private/team
        return $this->isAdmin($user) && $concept->getVisibility() === 'public';
    }

    private function canDelete(Concept $concept, mixed $user): bool
    {
        // Same rules as edit
        return $this->canEdit($concept, $user);
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
