<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Snippet;
use App\Entity\User;
use App\Service\TeamMembershipService;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Lot 4 — VIEW gate on a single Snippet.
 *
 * Edit/Delete authority lives on the parent Concept (see ConceptVoter), so
 * this voter only handles VIEW. The rule mirrors ConceptVoter::canView()
 * but evaluates the snippet's own `moderation_status` first — the parent
 * concept may be active while the individual snippet is hidden, and vice
 * versa.
 *
 * - VIEW on a snippet whose moderation_status != 'active' is denied unless
 *   the caller is the owner of the parent concept (active/flagged/hidden)
 *   or an admin (everything, including removed).
 * - When the snippet is `active`, fall back to the parent concept's
 *   visibility / sharing rules.
 */
final class SnippetVoter extends Voter
{
    public const VIEW = 'SNIPPET_VIEW';

    public function __construct(
        private readonly TeamMembershipService $memberships,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::VIEW && $subject instanceof Snippet;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        /** @var Snippet $snippet */
        $snippet = $subject;
        $user = $token->getUser();

        $concept = $snippet->getConcept();

        // Snippet-level moderation gate
        if ($snippet->getModerationStatus() !== 'active') {
            if (!$user instanceof User) {
                return false;
            }
            if ($this->isAdmin($user)) {
                return true;
            }
            if ($snippet->getModerationStatus() === 'removed') {
                return false;
            }
            return $this->isOwner($snippet, $user);
        }

        // Concept-level moderation gate (cascades to children)
        if ($concept->getModerationStatus() !== 'active') {
            if (!$user instanceof User) {
                return false;
            }
            if ($this->isAdmin($user)) {
                return true;
            }
            if ($concept->getModerationStatus() === 'removed') {
                return false;
            }
            return $this->isOwner($snippet, $user);
        }

        // Active snippet under active concept — fall back to visibility rules.
        if ($concept->getVisibility() === 'public') {
            return true;
        }

        if (!$user instanceof User) {
            return false;
        }

        if ($this->isOwner($snippet, $user)) {
            return true;
        }

        if ($concept->getVisibility() === 'team') {
            return $this->memberships->isMemberOfAnySharedTeam($user, $concept->getSharedTeams());
        }

        return false;
    }

    private function isOwner(Snippet $snippet, User $user): bool
    {
        return $snippet->getConcept()->getOwner()->getId()?->equals($user->getId()) ?? false;
    }

    private function isAdmin(User $user): bool
    {
        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }
}
