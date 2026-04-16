/**
 * Payload returned by GET /api/vault.
 * The server ONLY sees the ciphertext and salt — decryption is client-side.
 */
export interface VaultEntry {
  id: string;
  ciphertext: string;
  salt: string;
  failedAttempts: number;
  remainingAttempts: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface VaultUpsertInput {
  ciphertext: string;
  salt: string;
}

export interface VaultFailedAttemptResult {
  burned: boolean;
  remainingAttempts: number;
}
