<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Tag;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access control for Tag management (Phase 7).
 *
 * Tags are auto-created implicitly during concept/payload writes by any user —
 * that is NOT gated by this voter (it happens server-side inside syncTags()
 * and doesn't touch these attributes).
 *
 * The attributes here gate the *admin* operations: officialisation, rename,
 * merge, and hard delete. All four are ROLE_ADMIN only — leads have no tag
 * authority.
 */
final class TagVoter extends Voter
{
    public const OFFICIALIZE = 'TAG_OFFICIALIZE';
    public const RENAME = 'TAG_RENAME';
    public const MERGE = 'TAG_MERGE';
    public const DELETE = 'TAG_DELETE';

    private const ATTRIBUTES = [
        self::OFFICIALIZE,
        self::RENAME,
        self::MERGE,
        self::DELETE,
    ];

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, self::ATTRIBUTES, true) && $subject instanceof Tag;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        return in_array('ROLE_ADMIN', $user->getRoles(), true);
    }
}
