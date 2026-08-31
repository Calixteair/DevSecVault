export const environment = {
  production: true,
  apiUrl: 'https://vaultapi.calixteair.fr:4443/api',
  meiliUrl: 'https://vaultapi.calixteair.fr:4443/meili',
  keycloak: {
    authority: 'https://auth.calixteair.fr:4443/realms/devsecvault',
    clientId: 'devsecvault-frontend',
    redirectUrl: 'https://vault.calixteair.fr:4443',
    postLogoutRedirectUri: 'https://vault.calixteair.fr:4443',
  },
};
