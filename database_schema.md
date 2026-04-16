# DevSecVault — Schema Base de Donnees (PostgreSQL)

```mermaid
erDiagram

    %% ==========================================
    %% UTILISATEURS & EQUIPES
    %% ==========================================

    app_user {
        uuid id PK
        varchar keycloak_id UK "ID unique Keycloak (sub)"
        varchar email UK
        varchar username
        varchar role "ROLE_USER | ROLE_ADMIN"
        timestamp created_at
        timestamp updated_at
    }

    team {
        uuid id PK
        varchar name
        uuid owner_id FK "Team Lead (createur)"
        timestamp created_at
        timestamp updated_at
    }

    team_member {
        uuid id PK
        uuid team_id FK
        uuid user_id FK
        varchar role "lead | member"
        timestamp joined_at
    }

    team_invite_link {
        uuid id PK
        uuid team_id FK
        varchar token UK "Token unique pour le lien"
        boolean is_active "Peut etre desactive"
        timestamp expires_at "Nullable, expiration optionnelle"
        timestamp created_at
    }

    %% ==========================================
    %% DEV LIBRARY (Concepts & Snippets)
    %% ==========================================

    concept {
        uuid id PK
        uuid owner_id FK "Auteur"
        varchar title "Ex: Tri Fusion"
        text description "Nullable"
        varchar visibility "public | private | team"
        uuid team_id FK "Nullable, si partage equipe"
        timestamp created_at
        timestamp updated_at
    }

    snippet {
        uuid id PK
        uuid concept_id FK
        varchar language "Ex: php, python, javascript"
        text code "Code source avec variables {{VAR}}"
        int sort_order "Ordre d'affichage dans le concept"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% CYBER TOOLBOX (Payloads & Command Generators)
    %% ==========================================

    payload {
        uuid id PK
        uuid owner_id FK "Auteur"
        varchar title
        text description "Nullable, en clair (indexee Meilisearch)"
        text encrypted_content "AES-256 + Base64 (chiffre)"
        varchar category "Ex: reconnaissance, exploitation, privesc"
        varchar visibility "public | private | team"
        uuid team_id FK "Nullable, si partage equipe"
        timestamp created_at
        timestamp updated_at
    }

    command_template {
        uuid id PK
        uuid owner_id FK "Nullable (templates systeme = null)"
        varchar name "Ex: Nmap Scanner, MSFVenom"
        text description
        varchar category "Ex: reconnaissance, exploitation, privesc"
        json fields "Definition des champs du formulaire"
        text command_pattern "Pattern avec placeholders {param}"
        boolean is_system "true = template pre-defini, non modifiable"
        timestamp created_at
        timestamp updated_at
    }

    %% ==========================================
    %% SECURE BRIDGE (Secrets E2E)
    %% ==========================================

    secret {
        uuid id PK
        text ciphertext "Chiffre cote client (E2E)"
        varchar iv "Vecteur d'initialisation"
        boolean burn_after_reading "Option 1-read"
        boolean has_been_read "Marque si deja lu"
        timestamp expires_at "created_at + 10 min (toujours)"
        uuid created_by FK "Nullable (guests peuvent creer)"
        timestamp created_at
    }

    %% ==========================================
    %% TAGS (Systeme de tagging)
    %% ==========================================

    tag {
        uuid id PK
        varchar name UK "Nom unique, normalise lowercase"
        boolean is_official "Marque par un admin"
        timestamp created_at
    }

    concept_tag {
        uuid concept_id FK
        uuid tag_id FK
    }

    payload_tag {
        uuid payload_id FK
        uuid tag_id FK
    }

    %% ==========================================
    %% RELATIONS
    %% ==========================================

    %% Equipes
    app_user ||--o{ team : "cree (owner)"
    team ||--o{ team_member : "contient"
    app_user ||--o{ team_member : "appartient a"
    team ||--o{ team_invite_link : "a des liens"

    %% Dev Library
    app_user ||--o{ concept : "possede"
    concept ||--o{ snippet : "contient (1 par langage)"
    team ||--o{ concept : "partage (nullable)"
    concept ||--o{ concept_tag : "a des tags"
    tag ||--o{ concept_tag : "tague des concepts"

    %% Cyber Toolbox
    app_user ||--o{ payload : "possede"
    team ||--o{ payload : "partage (nullable)"
    payload ||--o{ payload_tag : "a des tags"
    tag ||--o{ payload_tag : "tague des payloads"
    app_user ||--o{ command_template : "cree (nullable)"

    %% Secure Bridge
    app_user ||--o{ secret : "cree (nullable)"
```

## Notes sur les choix de modelisation

### UUIDs partout
Tous les IDs sont des UUID v4. Evite les IDs sequentiels previsibles (securite) et facilite la generation cote client pour le Secure Bridge.

### Visibility (public | private | team)
- `public` : visible par tous (guests inclus), indexe dans Meilisearch
- `private` : visible uniquement par le owner
- `team` : visible par les membres de l'equipe referencee dans `team_id`

### Partage equipe = soft relation
Le champ `team_id` + `visibility = team` sur Concept/Payload represente le partage. Pour "unshare", le Team Lead remet `visibility = private` et `team_id = null`. Le contenu n'est jamais supprime.

### Secure Bridge
- `expires_at` est TOUJOURS `created_at + 10 min`
- `burn_after_reading` + `has_been_read` gerent l'option "1 read"
- `created_by` est nullable car les guests (non connectes) peuvent creer des secrets
- Un CRON ou un trigger Symfony nettoie les secrets expires

### Command Templates
- `is_system = true` : templates pre-definis (Nmap, MSFVenom, Gobuster, etc.) non modifiables
- `is_system = false` : templates custom crees par un user
- `fields` est un JSON qui decrit le formulaire (nom, label, placeholder, type)
- `command_pattern` contient le pattern avec des placeholders : `nmap -p{port} -sC -sV -T{timing} {rhost}`

### Tags
- Table de jointure classique (ManyToMany) pour concepts et payloads
- `name` est unique et normalise en lowercase
- La fusion de tags (admin) = UPDATE des FK dans concept_tag/payload_tag puis DELETE du tag source
