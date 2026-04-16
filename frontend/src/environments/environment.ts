export const environment = {
  production: true,
  apiUrl: 'https://vaultapi.calixteair.fr/api',
  meiliUrl: 'https://vaultapi.calixteair.fr/meili',
  keycloak: {
    authority: 'https://auth.calixteair.fr/realms/devsecvault',
    clientId: 'devsecvault-frontend',
    redirectUrl: 'https://vault.calixteair.fr',
    postLogoutRedirectUri: 'https://vault.calixteair.fr',
  },
};
