export type PayloadCategory =
  | 'recon'
  | 'exploitation'
  | 'privesc'
  | 'post-exploitation'
  | 'defense'
  | 'other';

export type PayloadVisibility = 'public' | 'private' | 'team';

export interface PayloadOwner {
  id: string;
  username: string;
}

export interface PayloadTag {
  id: string;
  name: string;
  isOfficial?: boolean;
}

/** Shape of the elements in `payload.sharedTeams[]` returned by the API. */
export interface PayloadSharedTeamRef {
  id: string;
  name: string;
}

export interface PayloadListItem {
  id: string;
  title: string;
  description: string | null;
  category: PayloadCategory;
  language: string | null;
  visibility: PayloadVisibility;
  owner: PayloadOwner;
  tags: PayloadTag[];
  sharedTeams?: PayloadSharedTeamRef[];
  createdAt: string;
  updatedAt: string;
}

export interface Payload extends PayloadListItem {
  /** Plaintext body — the backend decrypts the AES-256 ciphertext on read. */
  body: string;
}

export interface PayloadCreateInput {
  title: string;
  description?: string | null;
  category: PayloadCategory;
  language?: string | null;
  visibility: PayloadVisibility;
  body: string;
  /** Tag names (server resolves or creates them). */
  tags: string[];
  /** Required (non-empty) when visibility='team'; omit otherwise. */
  sharedTeamIds?: string[];
}

export type PayloadUpdateInput = Partial<PayloadCreateInput>;
