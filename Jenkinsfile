// CI/CD de DevSecVault, exécutée par Jenkins (jenkins.calixteair.fr) avec la bibliothèque partagée
// calixteair (dépôt jenkins-lib) : gitleaks et Snyk, trois images + Trivy, publication sur Harbor.
//
//   PR        → analyses et images, rien n'est publié
//   master    → images <composant>-sha-<commit> et <composant>-latest, sans déploiement
//   tag vX.Y.Z signé → images vX.Y.Z-<composant> (immuables), puis déploiement : le VPS (stack-sync)
//                vérifie la signature du tag, épingle ces images et installe deploy/vps/ (compose, agent.hcl)
@Library('calixteair@v1') _

standardPipeline(
  deliveryBranch: 'master',
  // Pas de tests automatisés pour l'instant. Snyk : keycloak-altcha-spi (Maven) et shannon (hors dépôt) exclus
  snyk: [deps: '--all-projects --exclude=keycloak-altcha-spi,shannon'],
  registry: [url: 'registry.calixteair.fr/devsecvault', bao: 'cicd/harbor/devsecvault'],
  images: [
    [name: 'devsecvault', tagPrefix: 'backend', context: '.', dockerfile: 'docker/php/Dockerfile.prod'],
    [name: 'devsecvault', tagPrefix: 'api', context: '.', dockerfile: 'docker/nginx/Dockerfile'],
    [name: 'devsecvault', tagPrefix: 'frontend', context: '.', dockerfile: 'docker/node/Dockerfile.prod'],
  ],
  heavy: false,
  signedReleases: true,
  deploy: [stack: 'devsecvault', url: 'https://vault.calixteair.fr'],
)
