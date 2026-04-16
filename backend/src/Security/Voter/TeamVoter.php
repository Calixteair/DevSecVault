<?php

declare(strict_types=1);

namespace App\Security\Voter;

use App\Entity\Team;
use App\Entity\User;
use App\Repository\TeamMemberRepository;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Vote;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

/**
 * Access rules for Team (Phase 6 Teams + RBAC).
 *
 * - VIEW: any member of the team (lead or member).
 * - MANAGE: lead only — rename, delete team, kick members, manage invites,
 *   transfer lead, list team-shared resources for un-share UI.
 * - LEAVE: same as VIEW. The controller enforces the business rule that a
 *   sole lead must either transfer leadership or delete the team before
 *   leaving (a lead can "leave" only if they are the last member, in which
 *   case the team is auto-disbanded).
 */
final class TeamVoter extends Voter
{
    public const VIEW = 'TEAM_VIEW';
    public const MANAGE = 'TEAM_MANAGE';
    public const LEAVE = 'TEAM_LEAVE';

    public function __construct(
        private readonly TeamMemberRepository $teamMemberRepository,
    ) {
    }

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::MANAGE, self::LEAVE], true)
            && $subject instanceof Team;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof User) {
            return false;
        }

        /** @var Team $team */
        $team = $subject;

        return match ($attribute) {
            self::VIEW, self::LEAVE => $this->teamMemberRepository->userIsMemberOf($user, $team),
            self::MANAGE => $this->teamMemberRepository->userIsLeadOf($user, $team),
            default => false,
        };
    }
}
