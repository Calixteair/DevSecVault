export type ApiTokenExpiryPreset = '7d' | '30d' | '90d' | '1y' | 'never';

export interface ApiToken {
  id: string;
  name: string;
  prefix: string;
  includeAdmin: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  expired: boolean;
}

export interface ApiTokenCreated extends ApiToken {
  /** Raw token (shown once, never returned again). */
  token: string;
}

export interface CreateApiTokenPayload {
  name: string;
  expiry: ApiTokenExpiryPreset;
  includeAdmin: boolean;
}
