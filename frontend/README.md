# 🎨 DevSecVault — Frontend

Application Angular 21 single-page avec support SSR, construite pour la plateforme de cybersecurite DevSecVault.

## ⚙️ Stack

| Technologie | Version | Usage |
|-------------|---------|-------|
| 🅰️ Angular | 21.2 | Framework (Signals, composants Standalone) |
| 📘 TypeScript | 5.9 | Langage |
| ✏️ Monaco Editor | 0.55 | Editeur de code (Dev Library, Cyber Toolbox) |
| 🔐 hash-wasm | 4.12 | Derivation de cle Argon2id (Secure Bridge) |
| 🔒 Web Crypto API | native | Chiffrement E2E AES-256-GCM (Secure Bridge) |
| 🔑 angular-auth-oidc-client | 21.x | Authentification Keycloak OIDC |
| 💎 Lucide Angular | 1.x | Systeme d'icones |
| 🛡️ DOMPurify | 3.4 | Sanitisation XSS |
| 🌐 Express | 5.x | Serveur SSR |

## 🏗️ Architecture

```
src/app/
├── 📦 core/
│   ├── services/           # 13 services injectables
│   │   ├── auth.service            # Login/logout Keycloak OIDC, parsing JWT
│   │   ├── theme.service           # Mode sombre/clair (persiste en localStorage)
│   │   ├── secure-bridge-crypto    # Web Crypto AES-GCM + Argon2id (hash-wasm)
│   │   ├── vault.service           # Wrapper HTTP vault personnel
│   │   ├── secret-link.service     # Wrapper HTTP secrets partageables
│   │   ├── concept.service         # Wrapper HTTP Dev Library
│   │   ├── payload.service         # Wrapper HTTP Cyber Toolbox
│   │   ├── tag.service             # Gestion des tags + autocompletion Meilisearch
│   │   ├── team.service            # CRUD equipe + liens d'invitation
│   │   ├── search.service          # Token tenant Meilisearch + recherche
│   │   ├── admin.service           # Stats admin + moderation
│   │   ├── dashboard.service       # Agregation dashboard
│   │   └── notification.service    # Systeme de notifications toast
│   ├── models/             # 8 interfaces TypeScript
│   ├── interceptors/       # Injection du Bearer token (ignore pour les guests)
│   └── guards/             # Guard de route admin
│
├── 🧩 features/            # Modules fonctionnels lazy-loaded
│   ├── dashboard/          # 📊 Cartes resume, activite recente, acces rapide
│   ├── dev-library/        # 📚 Navigateur de concepts, editeur Monaco, template {{VAR}}
│   ├── cyber-toolbox/      # ⚔️ Navigateur de payloads chiffres, variables de template
│   ├── secure-bridge/      # 🔗 Vault personnel (Argon2id) + generateur de liens
│   ├── it-tools/           # 🧰 23 utilitaires client-side (voir ci-dessous)
│   ├── teams/              # 👥 Gestion d'equipe, invitations, liste des membres
│   ├── admin/              # 🛡️ Stats, gouvernance des tags, moderation de contenu
│   ├── settings/           # ⚙️ Bascule theme, preferences
│   ├── profile/            # 👤 Affichage du profil utilisateur
│   └── login/              # 🔑 Point d'entree redirection OIDC
│
├── 🖼️ layout/              # Sidebar (icones seules, w-16) + Topbar (recherche, badge user)
└── 🔁 shared/              # ConfirmDialog, TagPill, TagInput
```

## 🗺️ Routing

| Chemin | Composant | Layout | Acces |
|--------|-----------|--------|-------|
| `/` | redirection → `/dashboard` | — | — |
| `/dashboard` | 📊 DashboardComponent | Sidebar + Topbar | Tous |
| `/dev-library` | 📚 DevLibraryComponent | Sidebar + Topbar | Tous |
| `/cyber-toolbox` | ⚔️ CyberToolboxComponent | Sidebar + Topbar | Tous |
| `/secure-bridge` | 🔗 SecureBridgeComponent | Sidebar + Topbar | Tous |
| `/it-tools` | 🧰 ItToolsComponent | Sidebar + Topbar | Tous |
| `/it-tools/:slug` | 🧰 ToolHostComponent | Sidebar + Topbar | Tous |
| `/teams` | 👥 TeamsPageComponent | Sidebar + Topbar | 🔑 Authentifie |
| `/settings` | ⚙️ SettingsComponent | Sidebar + Topbar | Tous |
| `/profile` | 👤 ProfileComponent | Sidebar + Topbar | 🔑 Authentifie |
| `/admin` | 🛡️ AdminComponent | Sidebar + Topbar | 🛡️ ROLE_ADMIN |
| `/secret/:id` | 🔐 SecretViewerComponent | **Aucun** (standalone) | 🌍 Public/Auth |
| `/invite/:token` | 📨 InviteComponent | **Aucun** (standalone) | 🌍 Public |

## 🧰 IT Tools (23)

> 💡 Tous les outils tournent 100% cote client — aucune donnee ne quitte le navigateur.

| # | Outil | Categorie | Description |
|---|-------|-----------|-------------|
| 1 | Hash Text | 🔐 Crypto | MD5, SHA-1/256/512, SHA-3 |
| 2 | HMAC Generator | 🔐 Crypto | HMAC avec cle personnalisee |
| 3 | Bcrypt | 🔐 Crypto | Hachage et verification de mots de passe |
| 4 | Base64 | 🔐 Crypto | Encodage/decodage Base64 |
| 5 | JWT Parser | 🔐 Crypto | Decodage de tokens JWT |
| 6 | UUID Generator | 🔐 Crypto | UUID v4 et v7 |
| 7 | Password Generator | 🔐 Crypto | Mots de passe forts + metre d'entropie |
| 8 | TOTP Generator | 🔐 Crypto | TOTP RFC 6238 + QR code |
| 9 | Subnet Calculator | 🌐 Reseau | IPv4 CIDR, masque, broadcast, plages |
| 10 | IPv4 / Integer | 🌐 Reseau | IPv4 ↔ entier 32 bits |
| 11 | MAC Lookup | 🌐 Reseau | Resolution du vendeur OUI |
| 12 | URL Parser | 🌐 Reseau | Decomposition des composants d'URL |
| 13 | User-Agent Parser | 🌐 Reseau | Identification navigateur, OS, appareil |
| 14 | Base Converter | 🔤 Encodage | Binaire, octal, decimal, hexadecimal |
| 15 | URL Encode/Decode | 🔤 Encodage | Encodage pourcentage |
| 16 | JSON Formatter | 🔤 Encodage | Validation, formatage, minification |
| 17 | JSON / YAML | 🔤 Encodage | Conversion bidirectionnelle |
| 18 | Regex Tester | 💻 Dev | Test et explication de patterns regex |
| 19 | Cron Builder | 💻 Dev | Construction d'expressions cron |
| 20 | Chmod Calculator | 💻 Dev | Permissions symboliques ↔ octales |
| 21 | Text Diff | 💻 Dev | Comparaison ligne par ligne |
| 22 | X.509 Parser | 🎯 Cybersec | Inspection de certificats PEM |
| 23 | CVSS Calculator | 🎯 Cybersec | Scoring CVSS 3.1 / 4.0 |

> ➕ Ajouter un nouvel outil necessite seulement **deux etapes** :
> 1. Creer un composant dans `features/it-tools/tools/<slug>.component.ts`
> 2. Ajouter une entree dans `features/it-tools/tools.catalog.ts`

## 🔐 Chiffrement cote client (Secure Bridge)

Le `SecureBridgeCryptoService` implemente deux flux de chiffrement :

**🗄️ Vault personnel** — base sur une passphrase
```
passphrase + sel(16o) → Argon2id(64Mio, t=3, p=4) → cle AES-256
texte clair → AES-256-GCM(iv=12o) → base64(iv || ciphertext || tag)
```

**🔗 Liens de partage** — cle aleatoire dans le fragment URL
```
crypto.getRandomValues(32o) → cle AES-256 → exportee en base64
texte clair → AES-256-GCM(iv=12o) → base64(iv || ciphertext || tag)
URL : /secret/{id}#base64_key   ← le fragment n'est jamais envoye au serveur
```

## 🎨 Design System

Bi-theme via proprietes CSS custom sur `<html class="dark">` :

| Token | 🌞 Clair | 🌙 Sombre |
|-------|----------|-----------|
| `--primary` | 🔵 `#2563EB` bleu | 🟢 `#22C55E` vert |
| `--accent` | 🟣 `#6D28D9` violet | 🟠 `#F97316` orange |
| `--destructive` | 🔴 `#EF4444` rouge | 🔴 `#EF4444` rouge |

Couleurs par module :
- 📚 Dev Library → `--primary`
- ⚔️ Cyber Toolbox → `--accent`
- 🔗 Secure Bridge → `--destructive`

Typographie : **Inter** (UI) + **JetBrains Mono** (code, labels, terminaux).

📱 Breakpoints responsive : `768px` (mobile) et `860px` (tablette).

## 🖥️ Developpement

```bash
# Via Docker (recommande) 🐳
docker compose up --build -d
# → http://localhost:4200

# Standalone (necessite Node 22+)
cd frontend
npm install
npx ng serve --host 0.0.0.0
```

## 📦 Build de production

Build Docker multi-stage (`docker/node/Dockerfile.prod`) :
1. `npm ci` + `ng build` avec config production (pas de source maps, controle des budgets)
2. Sortie servie par nginx avec fallback SPA routing
