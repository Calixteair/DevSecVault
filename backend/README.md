# 🔧 DevSecVault — Backend

API REST Symfony 8 avec authentification Keycloak OIDC, chiffrement AES-256-GCM des payloads et integration Meilisearch.

## ⚙️ Stack

| Technologie | Version | Usage |
|-------------|---------|-------|
| 🐘 PHP | 8.4 | Runtime |
| 🎵 Symfony | 8.0 | Framework (Security, Serializer, Validator, UID) |
| 📦 Doctrine ORM | 3.3 | Abstraction BDD, cles primaires UUID v6 |
| 🐘 PostgreSQL | 16 | Base de donnees relationnelle |
| 🔎 Meilisearch | 1.13 | Recherche full-text (3 index) |
| 🔑 Keycloak | OIDC | Fournisseur d'authentification |
| 🌐 Nelmio CORS | 2.5 | Gestion du cross-origin |

## 🏗️ Architecture

```
src/
├── 🎯 Controller/Api/         # 13 controllers REST
│   ├── HealthController          # GET /api/health
│   ├── ConceptController         # 📚 CRUD Dev Library
│   ├── SnippetController         # 📝 CRUD snippets dans les concepts
│   ├── PayloadController         # ⚔️ CRUD Cyber Toolbox (auto-chiffrement/dechiffrement)
│   ├── VaultController           # 🗄️ Vault personnel (stockage ciphertext E2E)
│   ├── SecretLinkController      # 🔗 Liens secrets partageables
│   ├── TeamController            # 👥 Gestion d'equipe
│   ├── TeamInviteAcceptController
│   ├── TeamInviteLinkController
│   ├── UserController            # 👤 Profil utilisateur
│   ├── TagController             # 🏷️ CRUD tags
│   ├── SearchController          # 🔎 Generation de tenant tokens Meilisearch
│   └── AdminController           # 🛡️ Stats + moderation
│
├── 📦 Entity/                 # 10 entites Doctrine (UUID v6)
│   ├── User                      # 👤 Synchronise depuis Keycloak au premier login
│   ├── Concept                   # 📚 Concept Dev Library (1→N Snippets)
│   ├── Snippet                   # 📝 Snippet de code avec langage
│   ├── Payload                   # 🔒 Payload chiffre (AES-256-GCM)
│   ├── Tag                       # 🏷️ Ressource taggable avec drapeau officiel
│   ├── Team                      # 👥 Equipe avec proprietaire (lead)
│   ├── TeamMember                # 🤝 Appartenance utilisateur-equipe
│   ├── TeamInviteLink            # 📨 Token d'invitation partageable
│   ├── VaultEntry                # 🗄️ Vault personnel chiffre E2E
│   └── SecretLink                # 🔗 Secret partage E2E usage unique
│
├── 📂 Repository/             # 10 repositories Doctrine
│
├── 🛡️ Security/
│   ├── KeycloakUserProvider      # 🔑 Provisioning OIDC (auto-creation au premier login)
│   ├── KeycloakAccessTokenHandler # 🪪 Validation de token JWT
│   ├── PayloadCipher             # 🔐 Service chiffrement/dechiffrement AES-256-GCM
│   └── Voter/              # ✅ 6 voters d'autorisation
│       ├── ConceptVoter          # Proprietaire OU admin-sur-public
│       ├── PayloadVoter          # Proprietaire OU admin-sur-public + UNSHARE_FROM_TEAM
│       ├── VaultEntryVoter       # Proprietaire uniquement (pas d'acces admin)
│       ├── SecretLinkVoter       # Public ou conditionne par requireAuth
│       ├── TagVoter              # ROLE_ADMIN uniquement
│       └── TeamVoter             # Verification proprietaire/membre
│
├── 🔧 Service/
│   └── TeamMembershipService     # Utilitaire d'appartenance equipe
│
├── 🔎 Meilisearch/
│   ├── ConceptIndexer            # Indexation metadonnees concepts (jamais le code)
│   ├── PayloadIndexer            # Indexation metadonnees payloads (jamais le corps)
│   ├── TagIndexer                # Indexation noms de tags
│   └── Listeners/                # Listeners Doctrine pour synchronisation automatique
│
└── ⚡ Command/
    └── MeilisearchReindexCommand # Re-indexation complete (snippets, payloads, tags)
```

## 🔐 Chiffrement

### ⚔️ Cyber Toolbox — AES-256-GCM cote serveur

Le service `PayloadCipher` chiffre les corps des payloads avant stockage :

```
texte clair → OpenSSL AES-256-GCM(cle, nonce_aleatoire[12]) → base64(nonce || ciphertext || tag[16])
```

| Parametre | Detail |
|-----------|--------|
| 🔑 **Cle** | Chaine base64 de 32 octets issue de `ENCRYPTION_KEY` (geree via Symfony Secrets) |
| 🎲 **Nonce** | 12 octets aleatoires par chiffrement (pas de reutilisation) |
| ✅ **Tag d'authentification** | 16 octets GCM (detection d'alteration) |
| 📐 **Overhead** | 28 octets (12 nonce + 16 tag) + expansion base64 (~37%) |

> 💡 Le controller chiffre de maniere transparente a l'ecriture et dechiffre a la lecture. Les endpoints de liste n'incluent jamais le corps.

### 🔗 Secure Bridge — Stockage de ciphertext E2E

VaultEntry et SecretLink stockent du **ciphertext opaque** — le serveur ne voit jamais le clair ni les cles :

- 🗄️ **VaultEntry** : Stocke `{ciphertext, salt}`. Le client derive la cle depuis la passphrase via Argon2id.
- 🔗 **SecretLink** : Stocke `{ciphertext}`. Le client genere une cle aleatoire, encodee dans le fragment URL.

## 📡 Endpoints API

### 🌍 Publics (sans authentification)

```
GET  /api/health                           # ❤️ Verification de sante (connectivite BDD)
GET  /api/concepts                         # 📚 Lister les concepts publics
GET  /api/concepts/{id}                    # 📚 Voir un concept public
GET  /api/payloads                         # ⚔️ Lister les payloads publics (metadonnees)
GET  /api/search/token                     # 🔎 Token tenant Meilisearch (scope)
GET  /api/secret-links/{id}                # 🔗 Recuperer le ciphertext d'un secret partage
POST /api/secret-links/{id}/consume        # 🔥 Bruler un secret partage
POST /api/teams/invite/{token}/accept      # 👥 Accepter une invitation d'equipe
```

### 🔑 Authentifies (ROLE_USER)

```
POST   /api/concepts                       # ➕ Creer un concept
PUT    /api/concepts/{id}                  # ✏️ Modifier son concept
DELETE /api/concepts/{id}                  # 🗑️ Supprimer son concept
POST   /api/concepts/{id}/snippets         # ➕ Ajouter un snippet
PUT    /api/snippets/{id}                  # ✏️ Modifier un snippet
DELETE /api/snippets/{id}                  # 🗑️ Supprimer un snippet

POST   /api/payloads                       # 🔒 Creer un payload (auto-chiffre)
GET    /api/payloads/{id}                  # 🔓 Recuperer un payload (auto-dechiffre)
PUT    /api/payloads/{id}                  # ✏️ Modifier un payload
DELETE /api/payloads/{id}                  # 🗑️ Supprimer un payload

GET    /api/vault                          # 🗄️ Recuperer le slot vault personnel
PUT    /api/vault                          # 🗄️ Upsert vault (slot unique)
DELETE /api/vault                          # 🧹 Vider le vault
POST   /api/vault/failed-attempt           # ⚠️ Signaler un echec (burn a 3)

POST   /api/secret-links                   # 🔗 Creer un secret partageable

POST   /api/teams                          # 👥 Creer une equipe
GET    /api/teams/{id}                     # 👥 Voir une equipe
POST   /api/teams/{id}/invite-links        # 📨 Generer un lien d'invitation
```

### 🛡️ Admin (ROLE_ADMIN)

```
GET    /api/admin/stats                    # 📊 Statistiques de la plateforme
GET    /api/admin/public-content           # 🔎 Rechercher dans le contenu public
GET    /api/tags                           # 🏷️ Lister les tags avec compteurs d'utilisation
PUT    /api/admin/tags/{id}                # ✏️ Renommer un tag
POST   /api/admin/tags/{id}/officialize    # ⭐ Basculer le statut officiel
POST   /api/admin/tags/{id}/merge          # 🔀 Fusionner des tags (reassignation + suppression)
DELETE /api/admin/tags/{id}                # 🗑️ Supprimer un tag
```

## ✅ Autorisation (Voters)

| Entite | VIEW | EDIT | DELETE | Special |
|--------|------|------|--------|---------|
| 📚 Concept | Public OU proprietaire | Proprietaire OU admin (public seulement) | Proprietaire OU admin (public seulement) | — |
| ⚔️ Payload | Public OU proprietaire | Proprietaire OU admin (public seulement) | Proprietaire OU admin (public seulement) | UNSHARE_FROM_TEAM (team lead) |
| 🗄️ VaultEntry | Proprietaire uniquement | Proprietaire uniquement | Proprietaire uniquement | 🚫 L'admin **n'y a pas acces** |
| 🔗 SecretLink | Public (si !requireAuth) | — | Proprietaire | — |
| 🏷️ Tag | Tous | ��️ ROLE_ADMIN | 🛡️ ROLE_ADMIN | MERGE, OFFICIALIZE (ROLE_ADMIN) |
| 👥 Team | Membres | Lead/proprietaire | Lead/proprietaire | — |

## 🔎 Integration Meilisearch

Trois index, synchronises via les listeners d'evenements Doctrine :

| Index | Champs recherchables | Exclus |
|-------|---------------------|--------|
| 📚 `snippets` | titre, description, tags, langage | ❌ **code** (jamais indexe) |
| ⚔️ `payloads` | titre, description, tags, categorie | ❌ **corps** (jamais indexe — risque AV) |
| 🏷️ `tags` | nom | — |

**🎟️ Tenant Tokens** : JWT generes par utilisateur qui scopent les resultats de recherche :
- 👻 **Guest** : `visibility = "public"`
- 👤 **User** : `visibility = "public" OR owner_id = "<user_id>"`
- 👥 **Membre d'equipe** : ajoute les ressources partagees avec l'equipe au scope

> 🔄 Commande de re-indexation : `php bin/console app:meilisearch:reindex`

## 👤 Hierarchie des roles

```yaml
role_hierarchy:
    ROLE_ADMIN: ROLE_TEAM_LEAD     # 🛡️ Admin herite de Team Lead
    ROLE_TEAM_LEAD: ROLE_USER      # 👑 Team Lead herite de User
```

> ⚠️ Les roles sont lus depuis le claim `realm_access.roles` du JWT Keycloak (pas depuis `/userinfo`).

## 🖥️ Developpement

```bash
# Via Docker (recommande) 🐳
docker compose up --build -d
# API disponible sur http://localhost:8000

# Executer les migrations
docker exec dsv-php php bin/console doctrine:migrations:migrate --no-interaction

# Re-indexer Meilisearch
docker exec dsv-php php bin/console app:meilisearch:reindex

# Vider le cache
docker exec dsv-php php bin/console cache:clear
```

## 📦 Production

Le Dockerfile de production (`docker/php/Dockerfile.prod`) genere une image optimisee :

| Etape | Detail |
|-------|--------|
| 📦 **Dependances** | Composer install avec `--no-dev --optimize-autoloader` |
| ⚡ **OPcache** | Active, `display_errors = Off` |
| 🔒 **Permissions** | Propriete `www-data` (permissions 775) |
| 🚀 **Entrypoint** | Execute migrations + re-indexation Meilisearch au demarrage |

### 🔐 Gestion de la cle de chiffrement via Symfony Secrets

```bash
# Generer la paire de cles sur le VPS (une seule fois)
docker run --rm -it --entrypoint sh devsecvault-backend
php bin/console secrets:generate-keys --env=prod
php bin/console secrets:set ENCRYPTION_KEY --env=prod
```

> 🔒 La cle privee est montee en volume dans le container (jamais dans l'image).
