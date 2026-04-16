<div align="center">
  <h1>DevSecVault</h1>
  <p><strong>Plateforme centralisee de savoir technique et d'outils cybersecurite</strong></p>
  <p>Auto-hebergee, chiffree, rapide.</p>

  ![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Symfony](https://img.shields.io/badge/Symfony-8-000000?style=for-the-badge&logo=symfony&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Meilisearch](https://img.shields.io/badge/Meilisearch-1.13-FF5CAA?style=for-the-badge&logo=meilisearch&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
</div>

---

## A propos

DevSecVault est une plateforme web auto-hebergee concue pour les professionnels de la cybersecurite et les developpeurs. Elle centralise les snippets de code, les payloads offensifs, les outils de generation de commandes et le partage de secrets chiffres — le tout dans un environnement securise ou les donnees sensibles sont chiffrees avant meme d'atteindre le serveur.

## Modules

| Module | Description |
|--------|-------------|
| **Dev Library** | Snippets de code avec Monaco Editor, multi-langages par concept, variables de template `{{VAR}}` remplacees a la copie |
| **Cyber Toolbox** | Payloads chiffres AES-256 cote serveur, generateurs de commandes (Nmap, MSFVenom, Gobuster...) |
| **Secure Bridge** | Partage de secrets avec chiffrement E2E (Web Crypto API). La cle reste dans l'URL fragment, jamais envoyee au serveur |
| **IT Tools** | Utilitaires 100% client-side : convertisseur de bases, calculateur de sous-reseaux, validateur JSON |
| **Tag Management** | Administration des tags : officialisation, fusion avec reassignation automatique |

## Securite

- **Cyber Toolbox** : les payloads sont chiffres en AES-256 + Base64 par Symfony avant stockage en base. Les antivirus de l'hebergeur ne voient que du ciphertext. Seules les metadonnees sont indexees dans Meilisearch.
- **Secure Bridge** : chiffrement de bout en bout via Web Crypto API. Le serveur ne stocke que le ciphertext. La cle de dechiffrement est dans le fragment URL (`#key`) qui n'est jamais transmis au serveur. Destruction automatique apres 10 minutes.
- **Recherche** : Meilisearch avec tenant tokens (JWT) qui scopent les resultats par role (public / equipe / prive).

## Stack technique

```
Frontend :  Angular 21 (Signals, Standalone, SSR)
Backend :   Symfony 8 (PHP 8.3+, API REST)
Auth :      Keycloak (OIDC)
Recherche : Meilisearch
BDD :       PostgreSQL 16
Proxy :     Nginx Proxy Manager
Deploy :    Docker Compose + GitHub Actions + DockerHub
```

## Demarrage rapide (dev local)

```bash
# Cloner le repo
git clone git@github.com:<username>/DevSecVault.git
cd DevSecVault

# Creer le reseau externe (premiere fois uniquement)
docker network create nginx-reverse-proxy

# Lancer les containers
docker compose up --build -d

# Frontend :  http://localhost:4200
# Meilisearch : http://localhost:7700
```

## Deploiement (VPS)

Les images Docker sont buildees par GitHub Actions et pushees sur DockerHub a chaque push sur `main`.

Sur le VPS, seuls 2 fichiers sont necessaires :
- `docker-compose.yml` — pull les images DockerHub
- `.env` — secrets de production

```bash
cd ~/docker/DevSecVault
docker compose pull
docker compose up -d
```

## Structure du projet

```
DevSecVault/
├── backend/                 # Symfony 8 (API REST)
│   ├── src/
│   │   ├── Controller/      # Endpoints API
│   │   ├── Entity/          # Entites Doctrine (UUID)
│   │   ├── Repository/      # Repositories
│   │   └── Security/        # Keycloak OIDC handler
│   └── config/              # Configuration Symfony
├── frontend/                # Angular 21 (SPA)
│   └── src/
│       ├── app/
│       │   ├── layout/      # Sidebar + Topbar
│       │   ├── features/    # Modules (lazy-loaded)
│       │   └── core/        # Services (theme, auth...)
│       └── styles.css       # Design system (CSS variables)
├── docker/                  # Dockerfiles (dev + prod)
├── deploy/vps/              # Config VPS (docker-compose + .env)
└── .github/workflows/       # CI/CD GitHub Actions
```

## Licence

Projet prive.
