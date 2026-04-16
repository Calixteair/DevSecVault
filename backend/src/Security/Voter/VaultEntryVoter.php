<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\User;
use App\Entity\VaultEntry;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access rules for VaultEntry (Secure Bridge personal vault).
 *
 * - VIEW / EDIT / DELETE: owner ONLY.
 *
 * Admins have NO access, not even VIEW — the content is E2E-encrypted with
 * a passphrase the server never sees, so visibility is meaningless. The
 * voter keeps the API consistent with other resources.
 */
final class VaultEntryVoter extends Voter
{
    public const VIEW = 'VAULT_VIEW';
    public const EDIT = 'VAULT_EDIT';
    public const DELETE = 'VAULT_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::DELETE], true)
            && $subject instanceof VaultEntry;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        /** @var VaultEntry $entry */
        $entry = $subject;
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false;
        }

        return $entry->getOwner()->getId()?->equals($user->getId()) ?? false;
    }
}
