<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\SecretLink;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access rules for SecretLink (Secure Bridge shared link).
 *
 * - VIEW / CONSUME: anyone if the link does not require auth; any ROLE_USER
 *   otherwise. The ciphertext is useless without the fragment key from the
 *   URL, so "viewing" only matters when combined with the client-side key.
 * - DELETE: owner only. Used for manual unshare (not yet exposed).
 */
final class SecretLinkVoter extends Voter
{
    public const VIEW = 'SECRET_LINK_VIEW';
    public const CONSUME = 'SECRET_LINK_CONSUME';
    public const DELETE = 'SECRET_LINK_DELETE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::CONSUME, self::DELETE], true)
            && $subject instanceof SecretLink;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        /** @var SecretLink $link */
        $link = $subject;
        $user = $token->getUser();

        return match ($attribute) {
            self::VIEW, self::CONSUME => $this->canAccess($link, $user),
            self::DELETE => $this->canDelete($link, $user),
            default => false,
        };
    }

    private function canAccess(SecretLink $link, mixed $user): bool
    {
        if (!$link->isRequireAuth()) {
            return true;
        }

        return $user instanceof User;
    }

    private function canDelete(SecretLink $link, mixed $user): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        return $link->getOwner()->getId()?->equals($user->getId()) ?? false;
    }
}
