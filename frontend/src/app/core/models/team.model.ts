export type TeamRole = 'lead' | 'member';

export interface TeamUserRef {
  id: string;
  email: string;
  displayName: string;
}

export interface TeamMember {
  id: string;
  user: TeamUserRef;
  role: TeamRole;
  joinedAt: string;
}

export type TeamInviteStatus = 'active' | 'disabled' | 'expired';

export interface TeamInviteLink {
  /** The token (UUID) used in invite URLs — same as the entity id. */
  id: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  status: TeamInviteStatus;
}

export interface TeamSummary {
  id: string;
  name: string;
  owner: TeamUserRef;
  memberCount: number;
  /** Current user's role in this team. Set by the backend via `serializeTeamWithRole`. */
  role: TeamRole;
  createdAt: string;
  updatedAt: string;
}

export type TeamDetail = TeamSummary & {
  members: TeamMember[];
  inviteLinks: TeamInviteLink[];
};

/**
 * Minimal shape used by the Teams page for inline listing + unshare of
 * resources shared with a team. Fields mirror the `concept:list` /
 * `payload:list` serializer groups. Kept loose (string ids, optional fields)
 * so we don't have to import the Concept/Payload models for this view.
 */
export interface TeamSharedResource {
  id: string;
  title: string;
  owner?: { id?: string; username?: string; displayName?: string; email?: string };
  tags?: Array<string | { name: string }>;
}

export interface TeamResources {
  concepts: TeamSharedResource[];
  payloads: TeamSharedResource[];
}
