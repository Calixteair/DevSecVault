export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080/api',
  meiliUrl: 'http://localhost:7700',
  keycloak: {
    authority: 'https://auth.calixteair.fr/realms/devsecvault',
    clientId: 'devsecvault-frontend',
    redirectUrl: 'http://localhost:4200',
    postLogoutRedirectUri: 'http://localhost:4200',
  },
};
