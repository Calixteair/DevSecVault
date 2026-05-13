<div align="center">

  <img src="https://raw.githubusercontent.com/Calixteair/DevSecVault/master/frontend/public/icons/favicon.svg" alt="DevSecVault" width="96" />

  # DevSecVault

  ### Le coffre-fort des pros de la cybersec.

  <p>
    <em>Snippets · Payloads chiffrés · Partage de secrets E2E · IT Tools client-side</em><br/>
    <strong>Auto-hébergé · Zéro tracking · RGPD-friendly · Zero-knowledge by design</strong>
  </p>

  <p>
    <a href="https://vault.calixteair.fr"><img src="https://img.shields.io/badge/▶_demo_live-vault.calixteair.fr-22C55E?style=for-the-badge&logoColor=white" alt="Live demo" /></a>
  </p>

  <p>
    <a href="#-démarrage-rapide">Quickstart</a> ·
    <a href="#-modules">Modules</a> ·
    <a href="#%EF%B8%8F-architecture">Architecture</a> ·
    <a href="SECURITY.md">Sécurité</a> ·
    <a href="ROADMAP.md">Roadmap</a>
  </p>

  <br/>

  <p>
    <a href="https://github.com/Calixteair/DevSecVault/actions/workflows/build-and-push.yml"><img src="https://img.shields.io/github/actions/workflow/status/Calixteair/DevSecVault/build-and-push.yml?style=flat-square&label=build&logo=githubactions&logoColor=white" alt="Build" /></a>
    <a href="https://vault.calixteair.fr"><img src="https://img.shields.io/website?url=https%3A%2F%2Fvault.calixteair.fr&style=flat-square&label=frontend&up_color=22C55E" alt="Frontend status" /></a>
    <a href="https://vaultapi.calixteair.fr/api/health"><img src="https://img.shields.io/website?url=https%3A%2F%2Fvaultapi.calixteair.fr%2Fapi%2Fhealth&style=flat-square&label=api&up_color=22C55E" alt="API status" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue?style=flat-square" alt="MIT" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular&logoColor=white" alt="Angular 21" />
    <img src="https://img.shields.io/badge/Symfony-8-000000?style=flat-square&logo=symfony&logoColor=white" alt="Symfony 8" />
    <img src="https://img.shields.io/badge/PHP-8.3-777BB4?style=flat-square&logo=php&logoColor=white" alt="PHP 8.3" />
    <img src="https://img.shields.io/badge/Keycloak-26.5-4D4D4D?style=flat-square&logo=keycloak&logoColor=white" alt="Keycloak 26.5" />
    <img src="https://img.shields.io/badge/Meilisearch-1.x-FF5CAA?style=flat-square&logo=meilisearch&logoColor=white" alt="Meilisearch" />
    <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL 16" />
    <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker Compose" />
  </p>

</div>

---

## ✨ En une phrase

Une plateforme web qui combine un Pastebin chiffré E2E, des Gists multi-langages avec templating, une Cyber Toolbox et un CyberChef léger — **auto-hébergée, sans tracking, RGPD-friendly**, alimentée par Keycloak pour l'auth et OpenBao pour les secrets serveur.

## 🧩 Modules

| Module | Description | Indexé public |
|--------|-------------|---------------|
| **📚 Dev Library** | Bibliothèque de **concepts** (un par sujet) regroupant un **snippet par langage**. Templating `{{VAR}}` remplacé côté client à la copie. Editeur Monaco. | ✅ |
| **🛠️ Cyber Toolbox** | Catalogue de **payloads** et scripts pentest, chiffrés **AES-256-GCM** en base. Catégories Reconnaissance / Exploitation / Privesc. Générateurs intégrés (Nmap, MSFVenom). | ✅ (métadonnées seulement) |
| **🔒 Secure Bridge** | Partage de secrets **chiffré bout-en-bout** via Web Crypto API. Clé dans le fragment URL (`#key`), jamais transmise au serveur. Burn-after-read en option. TTL max 10 min. | ❌ jamais indexé |
| **⚒️ IT Tools** | 23 utilitaires **100 % côté navigateur** : encodage hex/base64, calcul de sous-réseau IPv4, validateur JSON, hash, TOTP, etc. Aucune donnée ne quitte la page. | ✅ |
| **👥 Teams** | Partage de ressources entre membres d'une équipe via lien d'invitation. Le lead a un droit d'unshare (soft, pas de delete). | ❌ privé |
| **⚙️ Admin** | Modération a posteriori (DSA), gestion des tags officiels, fusion de tags, dashboard stats. | ❌ admin only |

## 🛡️ Choix de sécurité

- **Auth** : Keycloak OIDC, brute-force protection, anti-bot **[Altcha](https://altcha.org)** (proof-of-work, pas de cookie tiers, SPI custom dans `keycloak-altcha-spi/`)
- **Chiffrement serveur** : payloads en `AES-256-GCM`, clé via Symfony Secrets (rotatable)
- **Chiffrement E2E** : Web Crypto API côté navigateur, le serveur n'a que le ciphertext
- **CSP stricte** : `default-src 'self'`, polices auto-hébergées, zéro CDN tiers
- **Rate-limit** : Symfony rate-limiters par endpoint sensible (signup, secret-link, search-token, report)
- **Quotas** : 100 concepts, 100 payloads, 50 vault items, 20 secret-links actifs, 10 PAT, 10 teams par user
- **RGPD** : suppression de compte **immédiate et irréversible** depuis la page Profil, IP des reports en HMAC-SHA256 salé, logs LCEN-conformes (1 an)
- **Stack SOC** : Wazuh + Falco + CrowdSec + Prometheus/Grafana branchée sur le VPS

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                  Nginx Proxy Manager (TLS, host)                │
└──┬───────────┬───────────┬───────────────────────────┬─────────┘
   │           │           │                            │
   ▼           ▼           ▼                            ▼
 vault.       vaultapi.   auth.                     search.
 (Angular)   (Symfony)   (Keycloak)                 (Meilisearch
                          + Altcha SPI               via tenant
                          + theme custom)            tokens)

              ┌──────────┐
              │PostgreSQL│
              └──────────┘
```

**Sources des secrets** : OpenBao → bao-agent → tmpfs → containers (zéro `.env` en clair).

## ⚙️ Stack technique

| Couche | Tech |
|--------|------|
| Frontend | Angular 21 + Signals + SSR / Prerender (pages publiques) |
| Backend | Symfony 8 / PHP 8.3 (controllers manuels, pas d'API Platform) |
| Auth | Keycloak 26.5 (realm `devsecvault`) + SPI custom Altcha |
| Recherche | Meilisearch (tenant tokens HMAC par user) |
| BDD | PostgreSQL 16 |
| Secrets | OpenBao + bao-agent en tmpfs |
| Build | Docker Compose, GH Actions, push Docker Hub, deploy VPS |
| Monitoring | Wazuh + Falco + CrowdSec + Prometheus / Grafana |

## 📂 Structure du repo

```
.
├── frontend/                  # Angular 21 (SSR + landing prerendue)
├── backend/                   # Symfony 8 / API REST
├── keycloak-altcha-spi/       # SPI Altcha pour Keycloak (Java 21, Maven)
├── keycloak-theme/            # Theme custom DSV (login, register, account)
├── docker/                    # Dockerfiles prod (php-fpm, node/nginx)
├── deploy/                    # Compose VPS de référence
├── .github/workflows/         # CI build & push 3 images Docker Hub
├── CC.md                      # Cahier des charges (français)
├── ROADMAP.md                 # Feuille de route ouverture publique
├── SECURITY_AUDIT_REPORT.md   # Audit white-box (avril 2026)
└── CLAUDE.md                  # Instructions Claude Code
```

## 🚀 Démarrage rapide

### Prérequis

- Docker + Docker Compose
- Réseau Docker externe `nginx-reverse-proxy` (proxy host)
- Realm Keycloak existant (ou utiliser celui livré dans `keycloak-theme/`)

### Lancement local

```bash
# 1. Cloner
git clone https://github.com/Calixteair/DevSecVault.git
cd DevSecVault

# 2. Override pour dev (volumes montés, ports exposés)
cp docker-compose.override.yml.dist docker-compose.override.yml

# 3. Variables d'env
cp .env.example .env  # à compléter (DB, Meili master key, Keycloak)

# 4. Lancer la stack
docker compose up -d

# 5. Init schema BDD
docker exec dsv-php php bin/console doctrine:migrations:migrate --no-interaction

# 6. (Optionnel) Seeds de démo
docker exec dsv-php php bin/console app:seed:concepts
docker exec dsv-php php bin/console app:seed:payloads
```

Frontend → `http://localhost:4200`
API → `http://localhost:8080/api`

### Build SPI Altcha

```bash
cd keycloak-altcha-spi
mvn clean package
# → target/keycloak-altcha-spi-1.0.0.jar
# → drop dans /opt/keycloak/providers/ + restart Keycloak
```

## 🤝 Contribution

Le projet est **open-source mais opéré à titre individuel non commercial** par un seul mainteneur. Les PRs sont les bienvenues, surtout pour :
- 🌍 Traductions du theme Keycloak (en/fr aujourd'hui, autres langues bienvenues)
- 🛠️ Nouveaux outils dans IT Tools (composant standalone Angular)
- 🐛 Bug fixes
- 🔍 Audits sécurité

Avant de contribuer, lire `CC.md` (cahier des charges) et `CLAUDE.md` (conventions).

## 📜 Licence

Code source publié sous licence **MIT**. Le contenu utilisateur (snippets, payloads partagés sur l'instance publique) appartient à ses auteurs.

## 🔗 Liens

- 🌐 **Démo live** : https://vault.calixteair.fr
- 📋 **Pages légales** : [CGU](https://vault.calixteair.fr/legal/terms) · [Confidentialité RGPD](https://vault.calixteair.fr/legal/privacy) · [Mentions légales](https://vault.calixteair.fr/legal/notice) · [Procédure DSA](https://vault.calixteair.fr/legal/abuse)
- 💚 **Soutenir** : https://vault.calixteair.fr/support
- 📨 **Signalement / abuse** : `dsvabuse@calixteair.fr`
