<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Payload;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access rules for Payload (Cyber Toolbox). Mirrors ConceptVoter:
 *
 * - VIEW: owner, or visibility=public (guests allowed)
 * - EDIT/DELETE: owner, or admin on PUBLIC payloads (never private — CC.md)
 * - CREATE: any authenticated ROLE_USER
 *
 * Admins have NO access to private payloads, not even VIEW — this is the same
 * "admin moderates public content only" rule applied to the Dev Library.
 */
final class PayloadVoter extends Voter
{
    public const VIEW = 'PAYLOAD_VIEW';
    public const EDIT = 'PAYLOAD_EDIT';
    public const DELETE = 'PAYLOAD_DELETE';
    public const CREATE = 'PAYLOAD_CREATE';

    protected function supports(string $attribute, mixed $subject): bool
    {
        if ($attribute === self::CREATE) {
            return true;
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

        // Owner can always view their own private payloads
        return $this->isOwner($payload, $user);
    }

    private function canEdit(Payload $payload, mixed $user): bool
    {
        if (!$user instanceof User) {
            return false;
        }

        if ($this->isOwner($payload, $user)) {
            return true;
        }

        // Admins moderate public content only — never private
        return $this->isAdmin($user) && $payload->getVisibility() === 'public';
    }

    private function canDelete(Payload $payload, mixed $user): bool
    {
        return $this->canEdit($payload, $user);
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
