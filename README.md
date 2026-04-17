<div align="center">

  # 🛡️ DevSecVault

  <p><strong>Plateforme auto-hebergee de savoir technique et cybersecurite avec chiffrement multi-couche</strong></p>
  <p>Stockez du code, chiffrez vos payloads, partagez des secrets — sous votre controle total.</p>

  <br/>

  [![Build & Push](https://github.com/Calixteair/DevSecVault/actions/workflows/build-and-push.yml/badge.svg)](https://github.com/Calixteair/DevSecVault/actions/workflows/build-and-push.yml)
  [![API Status](https://img.shields.io/website?url=https%3A%2F%2Fvaultapi.calixteair.fr%2Fapi%2Fhealth&label=API&style=flat-square)](https://vaultapi.calixteair.fr/api/health)
  [![Frontend Status](https://img.shields.io/website?url=https%3A%2F%2Fvault.calixteair.fr&label=Frontend&style=flat-square)](https://vault.calixteair.fr)
  [![Keycloak Status](https://img.shields.io/website?url=https%3A%2F%2Fauth.calixteair.fr%2Frealms%2Fdevsecvault&label=Keycloak&style=flat-square)](https://auth.calixteair.fr/realms/devsecvault)
  [![License](https://img.shields.io/badge/license-private-red?style=flat-square)](#)

  <br/>

  ![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Symfony](https://img.shields.io/badge/Symfony-8-000000?style=for-the-badge&logo=symfony&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Meilisearch](https://img.shields.io/badge/Meilisearch-1.13-FF5CAA?style=for-the-badge&logo=meilisearch&logoColor=white)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
  ![Keycloak](https://img.shields.io/badge/Keycloak-OIDC-4D4D4D?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0wIDE4Yy00LjQxIDAtOC0zLjU5LTgtOHMzLjU5LTggOC04IDggMy41OSA4IDgtMy41OSA0LTggOHoiLz48L3N2Zz4=&logoColor=white)

</div>

---

## 📖 Presentation

DevSecVault est une plateforme web auto-hebergee concue pour les professionnels de la cybersecurite et les developpeurs. Elle centralise les snippets de code, les payloads offensifs, les generateurs de commandes et le partage de secrets chiffres dans un environnement securise unique.

La plateforme implemente une **strategie de chiffrement a trois couches** ou les donnees sensibles sont protegees a chaque niveau — du chiffrement AES-256-GCM cote serveur pour les payloads (invisibles aux antivirus de l'hebergeur), au chiffrement de bout en bout pour les secrets (ou le serveur ne voit jamais ni le clair ni les cles), au scoping des resultats de recherche via les tenant tokens Meilisearch.

### 💡 Principes fondamentaux

| | Principe | Description |
|---|---------|-------------|
| 🔐 | **Zero-knowledge** | Les cles de chiffrement du Secure Bridge ne quittent jamais le navigateur |
| 🛡️ | **Immunite d'hebergement** | Les payloads chiffres sont opaques aux scanners AV du serveur |
| 👁️‍🗨️ | **Vie privee par defaut** | L'admin n'accede pas au contenu prive ; resultats de recherche scopes par role |
| 🏠 | **Auto-heberge** | Controle total des donnees, deploye sur votre propre VPS via Docker |

---

## 🧩 Modules

### 📚 Dev Library

> *Organisez votre code par concept, pas par fichier.*

Un gestionnaire de snippets structure ou chaque **Concept** (ex: "Tri Fusion", "Port Scanner") regroupe plusieurs **Snippets** — un par langage de programmation.

- ✏️ **Monaco Editor** avec coloration syntaxique et modes lecture seule / edition
- 🔄 **Variables de template** — Definissez des placeholders `{{TARGET}}`, `{{PORT}}` remplaces au moment de la copie, jamais stockes
- 🌐 **Navigation multi-langage** — Basculez entre les implementations Python, Go, Bash d'un meme concept
- 👥 **Controle de visibilite** — Public, prive ou partage avec une equipe

### ⚔️ Cyber Toolbox

> *Votre boite a outils offensive, chiffree au repos.*

Stockez et gerez vos payloads de pentest avec un **chiffrement AES-256-GCM cote serveur**. L'antivirus de l'hebergeur ne voit que du ciphertext opaque.

- 🔒 **Stockage chiffre** — Payloads chiffres en AES-256-GCM avant ecriture en base (nonce aleatoire 12 octets + tag d'authentification)
- ⚡ **API transparente** — Ecrivez en clair, lisez en clair ; le chiffrement/dechiffrement est gere par Symfony
- 📂 **Categorise** — Reconnaissance, Exploitation, Escalade de privileges, Post-exploitation, Defense
- 🔄 **Variables de template** — Meme substitution `{{VAR}}` que la Dev Library pour les commandes parametrables
- 🔍 **Indexation metadonnees uniquement** — Meilisearch indexe titres, tags, descriptions — jamais le corps du payload

### 🔗 Secure Bridge

> *Chiffrement de bout en bout. Le serveur ne voit rien.*

Deux modes distincts pour le transfert de secrets zero-knowledge :

**🗄️ Vault personnel** (un slot unique par utilisateur)
- Transferez du texte entre vos propres appareils via une passphrase
- Derivation de cle : **Argon2id** (64 Mio de memoire, 3 iterations, 4 parallelisme) via `hash-wasm`
- Chiffrement : **AES-256-GCM** via Web Crypto API
- 💀 3 tentatives echouees = destruction automatique
- ⏱️ Expiration automatique apres 10 minutes

**🔗 Liens de partage** (usage unique)
- Generez une URL partageable : `vault.example.com/secret/{id}#key_base64`
- La cle de dechiffrement vit dans le **fragment URL** (`#`) — jamais transmis au serveur
- Options : confirmation requise (protection anti-apercu bot), authentification requise
- 🔥 Consomme apres la premiere revelation, expire apres 10 minutes

### 🧰 IT Tools

> *23 utilitaires. Tout tourne dans votre navigateur.*

Une collection d'outils 100% client-side organises en 5 categories — **aucune donnee ne quitte le navigateur**.

| Categorie | Outils |
|-----------|--------|
| 🔐 **Crypto** | Generateurs de hash (MD5, SHA-1/256/512, SHA3), HMAC, Bcrypt, TOTP |
| 🌐 **Reseau** | Calculateur de sous-reseau, convertisseur IPv4-Int, parseur d'URL, MAC lookup, parseur User-Agent |
| 🔤 **Encodage** | Base64, encodage/decodage URL, convertisseur JSON-YAML |
| 💻 **Dev** | Formateur JSON, testeur Regex, generateur UUID, parseur JWT, diff texte, parseur cron, convertisseur couleurs |
| 🎯 **Cybersec** | Calculateur CVSS, calculateur Chmod, generateur de mots de passe, visualiseur X.509 |

### 👥 Teams

> *Collaborez sans perdre la propriete.*

- 🔗 **Liens d'invitation** — Les team leads generent des tokens partageables pour integrer des membres
- 📤 **Partage selectif** — Les membres choisissent quelles ressources partager avec l'equipe
- ✋ **Edition proprietaire uniquement** — Le partage donne la visibilite, pas le controle ; seul le proprietaire peut editer
- 🔄 **Soft unshare** — Les team leads peuvent retirer des ressources de la vue equipe sans les supprimer

### ⚙️ Panel Admin

> *Gouvernance des tags et moderation de la plateforme.*

- 📊 **Dashboard de statistiques** — Utilisateurs, equipes, tags, concepts, payloads par visibilite
- 🏷️ **Gestion des tags** — Officialisation, renommage, fusion (reassignation automatique de toutes les ressources liees), suppression
- 🔎 **Moderation de contenu** — Recherche et navigation vers n'importe quelle ressource publique

---

## 🏗️ Architecture

### 🔐 Modele de securite

```
                         Cyber Toolbox                    Secure Bridge
                    (chiffrement serveur)              (chiffrement E2E)

Navigateur ──clair──▶ Symfony ──AES-256-GCM──▶ BDD    Navigateur ──AES-GCM──▶ ciphertext ──▶ Symfony ──▶ BDD
Navigateur ◀──clair── Symfony ◀──dechiffre───── BDD    Navigateur ◀──dechiffre── ciphertext ◀── Symfony ◀── BDD
                                                                      ▲
                    Le serveur detient la cle               Cle dans le fragment URL (#)
                    L'AV ne voit que du ciphertext          Le serveur ne voit JAMAIS la cle
```

| Couche | Technologie | Objectif |
|--------|-----------|----------|
| 🔒 **Payloads au repos** | AES-256-GCM (OpenSSL, cote serveur) | Evasion AV hebergeur — ciphertext uniquement en BDD et sur disque |
| 🔐 **Secrets E2E** | AES-256-GCM (Web Crypto API, cote client) + Argon2id | Zero-knowledge — le serveur stocke des blobs opaques, la cle n'est jamais transmise |
| 🔍 **Scoping recherche** | Meilisearch Tenant Tokens (JWT) | Filtrage par role — les invites voient le public, les utilisateurs voient les leurs + equipe |
| 🪪 **Authentification** | Keycloak OIDC + validation JWT | API stateless, auto-provisioning au premier login |
| ✅ **Autorisation** | Symfony Voters (6 voters) | Controle d'acces par entite : propriete, appartenance equipe, visibilite |

### 👤 RBAC

| Role | Capacites |
|------|-----------|
| 👻 **Guest** | Lecture des ressources publiques, acces aux liens secrets partages, recherche scopee (public uniquement) |
| 👤 **User** | CRUD complet sur ses propres ressources, creation/rejoindre des equipes, partage avec equipe, utilisation du Secure Bridge |
| 👑 **Team Lead** | Gestion des membres, generation de liens d'invitation, retrait de ressources de l'equipe |
| 🛡️ **Admin** | Gouvernance des tags (fusion/officialisation), moderation du contenu public, consultation des stats. **Pas d'acces au contenu prive.** |

### 📡 Flux de donnees

```
┌─────────────┐     OIDC      ┌───────────┐
│  Keycloak   │◄─────────────►│  Angular   │
│  (auth.*)   │  JWT tokens   │  (vault.*) │
└─────────────┘               └─────┬──────┘
                                    │ HTTPS + Bearer token
                              ┌─────▼──────┐
                              │  Nginx RPM  │ ── rate limiting, HSTS, CSP
                              └─────┬──────┘
                                    │
                              ┌─────▼──────┐      ┌──────────────┐
                              │  Symfony 8  │◄────►│ PostgreSQL   │
                              │  (API REST) │      │ (chiffre     │
                              └─────┬──────┘      │  au repos)   │
                                    │              └──────────────┘
                              ┌─────▼──────┐
                              │ Meilisearch │ ── metadonnees uniquement (ni code, ni payloads)
                              └────────────┘
```

---

## ⚙️ Stack technique

| Composant | Technologie | Details |
|-----------|-----------|---------|
| 🅰️ **Frontend** | Angular 21 | Signals, composants Standalone, SSR, Monaco Editor |
| 🎵 **Backend** | Symfony 8 | PHP 8.4, controllers REST manuels, Doctrine ORM (UUID v6) |
| 🔑 **Auth** | Keycloak | OIDC, validation JWT, roles realm, theme login custom |
| 🔎 **Recherche** | Meilisearch 1.13 | Recherche full-text, tenant tokens, 3 index (snippets, payloads, tags) |
| 🐘 **Base de donnees** | PostgreSQL 16 | Donnees structurees, stockage chiffre des payloads |
| 🌐 **Proxy** | Nginx Proxy Manager | Terminaison SSL, rate limiting, headers de securite |
| 🚀 **CI/CD** | GitHub Actions | Build automatique de 3 images Docker a chaque push sur `master` → DockerHub |
| 🔐 **Crypto** | Web Crypto API + hash-wasm | AES-256-GCM cote client, derivation de cle Argon2id |

### 📦 Dependances frontend

| Librairie | Usage |
|-----------|-------|
| `angular-auth-oidc-client` | Integration Keycloak OIDC |
| `monaco-editor` | Editeur de code dans Dev Library et Cyber Toolbox |
| `hash-wasm` | Derivation de cle Argon2id pour le vault Secure Bridge |
| `lucide-angular` | Systeme d'icones (Lucide) |
| `dompurify` | Sanitisation XSS |
| `js-yaml`, `js-md5`, `js-sha3`, `bcryptjs` | Utilitaires crypto/encodage pour IT Tools |
| `qrcode` | Generation de QR codes |

---

## 📁 Structure du projet

```
DevSecVault/
├── 🔧 backend/                       # API Symfony 8
│   ├── src/
│   │   ├── Controller/Api/           # 13 controllers REST
│   │   ├── Entity/                   # 10 entites Doctrine (UUID v6)
│   │   ├── Repository/               # 10 repositories
│   │   ├── Security/                 # PayloadCipher, provider Keycloak, 6 voters
│   │   └── Service/                  # TeamMembershipService
│   ├── config/
│   │   └── packages/
│   │       ├── security.yaml         # Firewall, controle d'acces, hierarchie des roles
│   │       └── nelmio_cors.yaml      # CORS (origine scopee par env)
│   └── migrations/                   # Migrations Doctrine
│
├── 🎨 frontend/                      # SPA Angular 21
│   └── src/app/
│       ├── core/
│       │   ├── services/             # 13 services (auth, theme, crypto, wrappers API)
│       │   ├── models/               # 8 modeles TypeScript
│       │   └── interceptors/         # Intercepteur HTTP auth
│       ├── features/
│       │   ├── dashboard/            # Cartes resume, activite recente, acces rapide
│       │   ├── dev-library/          # Navigateur de concepts + editeur Monaco
│       │   ├── cyber-toolbox/        # Navigateur de payloads + variables de template
│       │   ├── secure-bridge/        # Vault + generateur de liens + visionneuse publique
│       │   ├── it-tools/             # 23 utilitaires client-side
│       │   ├── teams/                # Gestion d'equipe + invitations
│       │   ├── admin/                # Stats, tags, moderation
│       │   ├── settings/             # Theme, preferences
│       │   ├── profile/              # Profil utilisateur
│       │   └── login/                # Redirection OIDC Keycloak
│       └── layout/                   # Sidebar + Topbar + recherche
│
├── 🐳 docker/
│   ├── php/                          # PHP-FPM 8.4 (Dockerfiles dev + prod)
│   ├── node/                         # Angular (Dockerfiles dev + prod multi-stage)
│   └── nginx/                        # Reverse proxy FastCGI pour l'API
│
├── 🎭 keycloak-theme/                # Page de login Keycloak custom
├── 🚀 deploy/vps/                    # docker-compose VPS + .env.example
├── ⚙️ .github/workflows/             # Pipeline CI/CD
└── 📄 docker-compose.yml             # Stack de developpement local
```

---

## 🚀 Demarrage rapide

### Prerequis

- 🐳 Docker & Docker Compose
- 🔑 Une instance Keycloak (ou desactiver l'auth pour les tests locaux)

### Developpement local

```bash
git clone git@github.com:Calixteair/DevSecVault.git
cd DevSecVault

# Creer le reseau externe (premiere fois uniquement)
docker network create nginx-reverse-proxy

# Lancer tous les services
docker compose up --build -d
```

| Service | URL |
|---------|-----|
| 🎨 Frontend | http://localhost:4200 |
| 🔧 API | http://localhost:8000 |
| 🔎 Meilisearch | http://localhost:7700 |
| 🐘 PostgreSQL | localhost:5433 |

> 💡 L'entrypoint PHP execute automatiquement les migrations Doctrine et la configuration des index Meilisearch au demarrage.

### Variables d'environnement

Copiez et personnalisez le fichier d'override pour les secrets locaux :

```bash
cp docker-compose.override.yml.dist docker-compose.override.yml
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | 🐘 Mot de passe PostgreSQL |
| `MEILI_MASTER_KEY` | 🔎 Cle admin Meilisearch |
| `APP_SECRET` | 🎵 Secret applicatif Symfony |
| `ENCRYPTION_KEY` | 🔐 Cle AES-256 pour la Cyber Toolbox (base64, 32 octets) |
| `KEYCLOAK_URL` | 🔑 URL de base Keycloak |
| `KEYCLOAK_REALM` | 🔑 Nom du realm Keycloak |
| `CORS_ALLOW_ORIGIN` | 🌐 Regex des origines autorisees |

---

## 🚢 Deploiement

### Pipeline CI/CD

```
git push master
     │
     ▼
GitHub Actions ──build──▶ 3 images Docker ──push──▶ DockerHub
                           │ 🔧 devsecvault-backend   (PHP-FPM)
                           │ 🌐 devsecvault-api       (Nginx FastCGI)
                           │ 🎨 devsecvault-frontend  (Angular + Nginx)
```

### Deploiement VPS

Sur le VPS, seuls deux fichiers sont necessaires :

```bash
# ~/docker/DevSecVault/
├── docker-compose.yml    # Pull les images depuis DockerHub
└── .env                  # Secrets de production (voir deploy/vps/.env.example)
```

```bash
cd ~/docker/DevSecVault
docker compose pull
docker compose up -d --remove-orphans
```

> 💡 L'entrypoint PHP gere les migrations automatiquement au demarrage du container.

### 🔐 Symfony Secrets (cle de chiffrement)

La cle `ENCRYPTION_KEY` de la Cyber Toolbox est geree via Symfony Secrets :

- ✅ **Cle publique** — committee dans le repo, integree dans l'image Docker
- 🔒 **Cle privee** — generee sur le VPS, montee en lecture seule dans le container
- 🔜 Migration vers HashiCorp Vault prevue pour les futures versions

### 🎭 Theme Keycloak

Le theme de login custom est versionne dans `keycloak-theme/` mais **n'est pas deploye automatiquement** (Keycloak tourne dans un stack compose separe).

```bash
# Deploiement manuel
scp -r keycloak-theme/devsecvault/* vps:~/docker/EPI/themes/devsecvault/login/
```

---

## 🛡️ Durcissement securite

### 🔒 Niveau applicatif

- 🌐 **CORS** — Origine scopee par variable d'environnement (pas de wildcard en production)
- ✅ **Validation des entrees** — Limite de tags (20 par ressource), limite de taille ciphertext (1 Mio), echappement d'injection LIKE
- 🚫 **Protection contre les redirections ouvertes** — Validation same-origin sur les URL de retour apres authentification
- 🤫 **Sanitisation des erreurs** — Messages generiques dans les operations crypto (pas de stack traces brutes)
- 🧹 **Nettoyage du fragment** — Les cles de dechiffrement sont retirees de l'historique navigateur via `history.replaceState()`
- 🗺️ **Source maps desactivees** en production
- 🙈 **Header `x-powered-by`** supprime du serveur SSR Express

### 🏰 Niveau infrastructure

- 🔒 **HTTPS force** — Redirection HTTP 301 vers HTTPS sur tous les endpoints
- 📌 **HSTS** — `max-age=63072000; includeSubDomains; preload`
- 🛡️ **CSP** — Headers Content Security Policy sur le frontend
- ⏱️ **Rate limiting** — Nginx `limit_req_zone` sur l'API (30 req/s), vault (5 req/min), liens secrets (10 req/min)
- 🪪 **Headers de securite** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`
- 🔌 **Binding des ports** — PostgreSQL et Meilisearch bindes sur `127.0.0.1` uniquement
- 📁 **Permissions container** — Propriete `www-data` avec `775` (pas `777`)
- ⚙️ **Config PHP production** — `display_errors = Off`

### 🔍 Securite des index Meilisearch

| Index | Champs indexes | Exclus |
|-------|---------------|--------|
| `snippets` | titre, description, tags, langage, visibilite | ❌ **code** (jamais indexe) |
| `payloads` | titre, description, tags, categorie, visibilite | ❌ **corps** (jamais indexe — risque AV) |
| `tags` | nom, is_official | — |

> 🔐 Les entites Secure Bridge sont **completement exclues** de Meilisearch (pas d'indexeur, pas de listener — securise par omission).

---

## 📡 Endpoints API

### 🌍 Publics

| Methode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/health` | ❤️ Verification de sante |
| `GET` | `/api/concepts` | 📚 Lister les concepts publics |
| `GET` | `/api/payloads` | ⚔️ Lister les payloads publics (metadonnees uniquement) |
| `GET` | `/api/search/token` | 🔎 Token tenant Meilisearch |
| `GET` | `/api/secret-links/{id}` | 🔗 Recuperer le ciphertext d'un secret partage |
| `POST` | `/api/secret-links/{id}/consume` | 🔥 Bruler un secret partage |
| `POST` | `/api/teams/invite/{token}/accept` | 👥 Accepter une invitation d'equipe |

### 🔑 Authentifies (ROLE_USER)

| Methode | Chemin | Description |
|---------|--------|-------------|
| `POST` | `/api/concepts` | ➕ Creer un concept |
| `PUT/DELETE` | `/api/concepts/{id}` | ✏️ Editer/supprimer son concept |
| `POST` | `/api/concepts/{id}/snippets` | 📝 Ajouter un snippet a un concept |
| `POST` | `/api/payloads` | 🔒 Creer un payload (auto-chiffre) |
| `GET` | `/api/payloads/{id}` | 🔓 Recuperer un payload (auto-dechiffre) |
| `PUT/GET/DELETE` | `/api/vault` | 🗄️ CRUD vault personnel |
| `POST` | `/api/vault/failed-attempt` | ⚠️ Signaler un echec de dechiffrement |
| `POST` | `/api/secret-links` | 🔗 Creer un secret partageable |
| `POST` | `/api/teams` | 👥 Creer une equipe |
| `POST` | `/api/teams/{id}/invite-links` | 📨 Generer un lien d'invitation |

### 🛡️ Admin (ROLE_ADMIN)

| Methode | Chemin | Description |
|---------|--------|-------------|
| `GET` | `/api/admin/stats` | 📊 Statistiques de la plateforme |
| `GET` | `/api/admin/public-content` | 🔎 Rechercher dans le contenu public |
| `PUT` | `/api/admin/tags/{id}` | ✏️ Renommer un tag |
| `POST` | `/api/admin/tags/{id}/officialize` | ⭐ Basculer le statut officiel |
| `POST` | `/api/admin/tags/{id}/merge` | 🔀 Fusionner des tags (reassignation + suppression) |
| `DELETE` | `/api/admin/tags/{id}` | 🗑️ Supprimer un tag |

---

## 🗃️ Schema de base de donnees

10 entites avec cles primaires UUID v6 :

```
User ──┬──< Concept ──< Snippet
       │       │
       │       ├──< ConceptTag >── Tag
       │       │
       ├──< Payload
       │       │
       │       ├──< PayloadTag >── Tag
       │
       ├──< VaultEntry (slot unique, E2E)
       │
       ├──< SecretLink (usage unique, E2E)
       │
       └──< Team ──< TeamMember
                  ──< TeamInviteLink
```

> 🏷️ Modele de visibilite : `public` | `private` | `team` — controle a la fois l'acces API (via Voters) et l'indexation de recherche (via tenant tokens).

---

## 🎨 Design System

Systeme bi-theme avec proprietes CSS custom :

| Token | 🌞 Mode clair | 🌙 Mode sombre |
|-------|--------------|----------------|
| `--background` | `#F9FAFB` | `#101012` |
| `--primary` | 🔵 `#2563EB` (bleu) | 🟢 `#22C55E` (vert) |
| `--accent` | 🟣 `#6D28D9` (violet) | 🟠 `#F97316` (orange) |
| `--destructive` | 🔴 `#EF4444` (rouge) | 🔴 `#EF4444` (rouge) |

Chaque module a une couleur semantique :
- 📚 Dev Library → `--primary`
- ⚔️ Cyber Toolbox → `--accent`
- 🔗 Secure Bridge → `--destructive`

Typographie : **Inter** (UI) + **JetBrains Mono** (code, terminal, labels).

📱 Entierement responsive : breakpoints optimises a 768px et 860px pour le support mobile.

---

## 📄 Licence

Projet prive. Tous droits reserves.
