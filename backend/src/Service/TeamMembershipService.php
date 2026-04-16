<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Team;
use App\Entity\User;
use App\Repository\TeamMemberRepository;

/**
 * Centralised membership lookup with per-request memoisation.
 *
 * Voters can be invoked many times per list endpoint (once per item), so we
 * cache the role each user holds in a team (lead|member|null) to avoid N+1
 * queries against team_member.
 *
 * Scope: the service is stateless across HTTP requests — the cache only lives
 * for the duration of a single request because Symfony instantiates the
 * service once per request.
 */
final class TeamMembershipService
{
    /** @var array<string, array<string, string|null>> userId => teamId => role ('lead'|'member') or null */
    private array $cache = [];

    public function __construct(private readonly TeamMemberRepository $repo)
    {
    }

    /**
     * Returns 'lead', 'member', or null if the user is not in the team.
     */
    public function roleInTeam(User $user, Team $team): ?string
    {
        $uid = (string) $user->getId();
        $tid = (string) $team->getId();

        if (!isset($this->cache[$uid]) || !array_key_exists($tid, $this->cache[$uid])) {
            $tm = $this->repo->findOneByTeamAndUser($team, $user);
            $this->cache[$uid][$tid] = $tm?->getRole();
        }

        return $this->cache[$uid][$tid];
    }

    public function isMember(User $user, Team $team): bool
    {
        return $this->roleInTeam($user, $team) !== null;
    }

    public function isLead(User $user, Team $team): bool
    {
        return $this->roleInTeam($user, $team) === 'lead';
    }

    /**
     * @param iterable<Team> $sharedTeams
     */
    public function isMemberOfAnySharedTeam(User $user, iterable $sharedTeams): bool
    {
        foreach ($sharedTeams as $team) {
            if ($this->isMember($user, $team)) {
                return true;
            }
        }

        return false;
    }
}
