export interface SecretLinkCreateInput {
  ciphertext: string;
  requireConfirmation: boolean;
  requireAuth: boolean;
}

export interface SecretLinkCreated {
  id: string;
  requireConfirmation: boolean;
  requireAuth: boolean;
  createdAt: string;
  expiresAt: string;
}

export interface SecretLinkRead {
  id: string;
  ciphertext: string;
  requireConfirmation: boolean;
  requireAuth: boolean;
  createdAt: string;
  expiresAt: string;
}
