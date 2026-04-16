export type PayloadCategory =
  | 'recon'
  | 'exploitation'
  | 'privesc'
  | 'post-exploitation'
  | 'defense'
  | 'other';

export type PayloadVisibility = 'public' | 'private';

export interface PayloadOwner {
  id: string;
  username: string;
}

export interface PayloadTag {
  id: string;
  name: string;
  isOfficial?: boolean;
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
}

export type PayloadUpdateInput = Partial<PayloadCreateInput>;
