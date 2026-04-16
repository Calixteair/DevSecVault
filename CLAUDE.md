# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

**DevSecVault** est une plateforme web securisee auto-hebergee (VPS) concue pour centraliser le savoir technique et les outils offensifs/defensifs des professionnels de la cybersecurite. Le cahier des charges complet est dans **CC.md**.

## Stack Technique

| Composant | Technologie | Details |
|-----------|-------------|---------|
| Frontend | Angular 21 | Signals, composants Standalone, SSR |
| Backend | Symfony 8 | API REST manuelle (controllers), PHP 8.3+, Architecture classique (Controller/Service/Repository) |
| IAM | Keycloak | Deja existant sur le VPS, auth OIDC |
| Recherche | Meilisearch | Indexation vectorielle et textuelle, interrogation directe par Angular |
| BDD | PostgreSQL | Donnees structurees et chiffrees |
| Proxy | Nginx | Deja existant sur le VPS, SSL et routage |
| Deploy | Docker Compose | Conteneurs isoles, connectes au reseau externe Nginx/Keycloak |

## Modules Fonctionnels

1. **Dev Library** (Snippets) — CRUD personnel, Monaco Editor, multi-langages par concept, templating `{{VAR}}` remplace cote client a la copie
2. **Cyber Toolbox** (Scripts & Payloads) — CRUD personnel, chiffrement AES-256 serveur + Base64 avant ecriture en DB, generateur de commandes (Nmap, MSFVenom)
3. **Secure Bridge** (Secrets E2E) — Web Crypto API, cle dans le fragment URL (`#key`) jamais envoyee au serveur. Option "1 read" (burn apres premiere lecture) ou non, mais dans TOUS les cas le secret est detruit apres 10 minutes. Lien partageable avec n'importe qui (meme invites). Exclu de l'indexation Meilisearch
4. **ITTools** (Utilitaires) — 100% client-side (hex/base64, subnet calc, JSON formatter), aucune donnee ne quitte le navigateur
5. **Tag Management** (Admin) — Tags officiels (`is_official`), fusion de tags (reassignation ressources + suppression source + sync Meilisearch)

## Modele de Donnees : Concepts et Snippets (Dev Library)

Un **Concept** (ex: "Tri Fusion") regroupe plusieurs **Snippets**, un par langage. Sur la page d'un concept, l'utilisateur choisit le langage dans un selecteur pour voir le snippet correspondant. C'est une vraie relation en BDD (Concept 1->N Snippet), pas du tagging.

## Modele de Donnees : Equipes (Teams)

- Entite `Team` en BDD. Le createur devient automatiquement **Team Lead**.
- **Lien d'invitation** : le Team Lead genere un lien (token unique) pour inviter des membres.
- Chaque membre peut **partager** ses propres ressources avec l'equipe (flag/relation `shared_with_team`).
- Le Team Lead a les droits **read/update/delete** sur les ressources partagees a l'equipe.
- **Soft-unshare** : si le Lead retire une ressource de l'equipe, elle n'est PAS supprimee — elle redevient privee pour son auteur (retrait du partage uniquement).

## Chiffrement Serveur (Cyber Toolbox)

Cle AES-256 stockee via **Symfony Secrets** (`php bin/console secrets:set ENCRYPTION_KEY`). Chiffree dans le repo, decodee uniquement en prod avec la cle de dechiffrement. Migration vers HashiCorp Vault possible dans le futur.

## Protocoles de Securite (Data Flows)

### Flux Cyber Toolbox (chiffrement serveur)
```
Angular (clair) -> HTTPS -> Symfony (AES-256 + Base64) -> PostgreSQL
```
Objectif : empecher la detection par les AV de l'hebergeur. Seules les metadonnees (titres, tags, descriptions) sont indexees dans Meilisearch — jamais le contenu des payloads.

### Flux Secure Bridge (chiffrement E2E)
```
1. Angular genere une cle locale (Web Crypto API)
2. Angular chiffre la donnee
3. Angular envoie le ciphertext a Symfony
4. URL generee : https://vault.com/secret/{id}#KEY
```
Le serveur ne possede que le ciphertext, jamais la cle. Donnees totalement exclues de Meilisearch.

## RBAC (Roles Keycloak)

| Role | Permissions |
|------|-------------|
| Guest | Pas de token Keycloak. Angular n'envoie pas de header `Authorization`. Symfony autorise via `PUBLIC_ACCESS` dans `security.yaml`. Tenant token Meilisearch restreint a `{ "visibility": "public" }`. Peut acceder aux liens Secure Bridge. |
| User | Connecte via Keycloak (OIDC). CRUD complet sur ses propres ressources (Dev Library, Cyber Toolbox). Peut partager ses ressources avec son equipe. |
| Team Lead | Createur d'une equipe. Read/update/delete sur les ressources partagees a l'equipe. Genere les liens d'invitation. Soft-unshare (pas de suppression definitive). |
| Admin | Moderation globale. CRUD contenu public. Gestion des tags (fusion/officialisation). **Pas d'acces au contenu prive.** |

## Strategie de Recherche (Meilisearch)

- **Direct Search** : Angular interroge Meilisearch directement (pas via Symfony)
- **Tenant Tokens** : Symfony genere un JWT Meilisearch par utilisateur, scoping les resultats selon ses droits (Public + Team + Prive). Pour les guests : rules limitees a `{ "visibility": "public" }`.
- **Securite index** : seules les metadonnees des payloads sont indexees pour proteger les fichiers d'index sur disque

### Index Meilisearch (un par type)

| Index | Champs indexes | Raison |
|-------|---------------|--------|
| `snippets` | titre, description, tags, langage, visibility | Recherche de code par concept/langage |
| `payloads` | titre, description, tags, visibility | Jamais le contenu (securite AV) |
| `tags` | nom, is_official | Autocompletion et recherche de tags |

Index separes pour : filterable attributes differents par type, ranking rules specifiques, et scoping tenant tokens simplifie par index.

## Design UI/UX (Reference : /home/kalinux/github/design/)

Le design de reference est un prototype Figma exporte en React (shadcn/tailwind). Le code React ne doit PAS etre reutilise — seul le design visuel compte. L'implementation reelle sera en Angular 21.

### Layout Global

- **Sidebar gauche fixe (w-16, icones seules)** : logo "D" en haut (carre arrondi bg-primary), puis navigation verticale (Dashboard, Dev Library, Cyber Toolbox, Secure Bridge, IT Tools), en bas Settings + Profile. L'item actif a un fond `bg-primary text-primary-foreground`, les inactifs sont `text-muted-foreground` avec hover `bg-secondary`.
- **Top bar (h-16)** : barre de recherche centree avec icone Search + placeholder "Search snippets, tools, payloads... (Cmd+K)", dropdown de resultats en temps reel groupes par categorie. A droite : badge utilisateur (icone role + nom + label role), toggle theme (Sun/Moon), cloche notifications avec pastille rouge.
- **Zone de contenu** : prend tout l'espace restant, scrollable.

### Pages

**Login** : split-screen. Gauche = fond card avec logo Shield + "DevSec Vault" + description + liste de features (Dev Library, Cyber Toolbox, Secure Bridge) avec icones dans des cercles colores. Droite = formulaire centre dans une card (icone Lock dans cercle, titre "Welcome Back", champs email/password avec icones inline a gauche, bouton "Login to Vault" pleine largeur).

**Dashboard** : titre + sous-titre "Welcome back to DevSec Vault". 3 summary cards en grille (Total Snippets, Active Payloads, Secure Transfers) avec icone, valeur grande, trend badge. En dessous : grille 2/3 + 1/3 — a gauche "Recent Activity" (liste avec bullet point, action, item, categorie, timestamp), a droite "Quick Access" (grille 2 colonnes de boutons carres avec icone + label).

**Dev Library** : layout 3 colonnes. Sidebar secondaire (w-64) avec arborescence de dossiers depliables (PHP, JavaScript, SQL, Python) contenant les snippets. Zone centrale : header avec nom du snippet + badge langage + compteur variables, boutons Edit/Save + Copy Code. En dessous : Monaco Editor dans une card avec barre de titre (icone + nom fichier + mode read-only/edit). Sous l'editeur : formulaire "Template Variables" en grille pour remplir les `{{VAR}}` avec inputs `font-mono bg-input-background`.

**Cyber Toolbox** : meme sidebar secondaire (w-64) avec categories depliables (Reconnaissance, Exploitation, Privilege Escalation) contenant les outils. Zone principale : titre + description de l'outil, card "Tool Configuration" avec formulaire en grille (labels `font-mono`), puis "Command Preview" dans une card avec bordure accent, fond `bg-secondary/50`, code en `text-accent font-mono`, label "Live Update". Gros bouton "Copy Command" centre. En bas : notice de securite avec fond `bg-accent/10 border-accent`.

**Secure Bridge** : page centree. Icone Shield dans cercle rouge, titre "SECURE TRANSFER" en `font-mono tracking-wider`. Card principale avec bordure rouge (`border-2 border-destructive`), header rouge avec label "PLAINTEXT INPUT" / "ENCRYPTED DATA (E2E)" / "DECRYPTED MESSAGE". Textarea pour input, ou etat chiffre avec icone Lock + "End-to-End Encrypted Successfully" + champ URL readonly avec bouton Copy. Settings en 2 colonnes : Expiry (select) + Burn After Reading (switch). Bouton "Encrypt & Generate Link" en `bg-destructive`. Notice securite en bas avec liste des garanties E2E.

**IT Tools** : page centree. Icone Wrench dans cercle, titre "IT Tools". Navigation par Tabs (Converter, Subnet Calc, JSON Tools). Chaque outil dans une card : titre avec icone, description, zone input (textarea ou champs), zone output en grille (cards `bg-secondary` avec bouton Copy chacune).

**Settings** : page simple. Titre + sous-titre. Liste de cards empilees (Profile, Notifications, Security, Preferences) chacune avec icone + titre + description.

### Theming (Dark/Light)

Systeme de CSS variables avec classe `.dark` sur `<html>`. Le theme par defaut est **dark**.

**Light mode** (professionnel/corporate) :
- `--background: #F9FAFB`, `--foreground: #18181B`
- `--card: #FFFFFF`, `--border: #E4E4E7`
- `--primary: #2563EB` (bleu), `--accent: #6D28D9` (violet), `--destructive: #EF4444` (rouge)

**Dark mode** (cyber/tech) :
- `--background: #101012`, `--foreground: #F4F4F5`
- `--card: #18181B`, `--border: #27272A`
- `--primary: #22C55E` (vert), `--accent: #F97316` (orange), `--destructive: #EF4444` (rouge)

### Typographie

- **Police principale** : Inter (300-700)
- **Police mono** : JetBrains Mono (400-700) — utilisee pour le code, les labels techniques, les previews de commande, les noms de fichiers
- **Base font-size** : 16px, `border-radius: 0.5rem`

### Icones

Lucide Icons. Principales utilisees : LayoutDashboard, Code2, Wrench, Send, Hammer, Settings, Shield, Lock, Copy, Search, Bell, Sun, Moon, Crown, Users, User, ChevronRight, ChevronDown, Folder, Terminal, Clock, Eye, AlertTriangle, Hash, Network, FileJson.

### Couleurs semantiques par module

- **Dev Library** : `text-primary` (bleu en light, vert en dark)
- **Cyber Toolbox** : `text-accent` (violet en light, orange en dark) — bordures et highlights accent
- **Secure Bridge** : `text-destructive` (rouge) — bordures, headers, boutons en rouge
- **ITTools** : `text-primary`
- **Dashboard** : mix des 3 couleurs selon la card

### Patterns UI recurrents

- Cards : `bg-card border border-border rounded-lg p-6`
- Inputs : `font-mono bg-input-background border border-border rounded-lg`
- Boutons principaux : `bg-primary hover:bg-primary/90 text-primary-foreground`
- Badges : `text-xs px-2 py-1 bg-primary/10 text-primary rounded font-mono`
- Headers de section : icone + titre bold, parfois avec sous-titre muted
- Sidebar items actifs : `bg-primary text-primary-foreground`, inactifs : `hover:bg-secondary`
- Notices de securite : `bg-[color]/10 border border-[color] rounded-lg p-6` avec icone + titre mono + texte

## Roadmap de Developpement

### Phase 1 — Fondations (Docker + Auth + Shell Angular)
1. Docker Compose : conteneurs Symfony 8, Angular 21, PostgreSQL, Meilisearch
2. Configuration reseau : connexion au reseau externe Nginx + Keycloak existants
3. Symfony : setup initial, `security.yaml` avec Keycloak OIDC + PUBLIC_ACCESS pour guests
4. Angular : shell app avec routing, layout global (sidebar + topbar), theming dark/light
5. Entites de base : User (sync Keycloak), Tag

### Phase 2 — Dev Library
1. Entites : Concept, Snippet (Concept 1->N Snippet)
2. API REST : CRUD Concept + Snippet (avec Voters Symfony pour ownership)
3. Angular : page Dev Library complete (sidebar dossiers, Monaco Editor, template variables)
4. Indexation Meilisearch : index `snippets`, sync a la creation/update/delete

### Phase 3 — IT Tools
1. 100% Angular, pas de backend
2. Base Converter (hex/base64/binary/decimal)
3. Subnet Calculator IPv4
4. JSON Validator & Formatter

### Phase 4 — Cyber Toolbox
1. Entites : Payload/Script avec chiffrement AES-256 + Base64 cote Symfony
2. Symfony Secrets pour la cle de chiffrement
3. API REST : CRUD avec chiffrement/dechiffrement transparent
4. Angular : page Cyber Toolbox (sidebar categories, formulaire config, command preview live)
5. Indexation Meilisearch : index `payloads` (metadonnees uniquement)
6. Generateurs de commandes (Nmap, MSFVenom, etc.)

### Phase 5 — Secure Bridge
1. Angular : chiffrement E2E via Web Crypto API (AES-256-GCM)
2. Symfony : stockage ciphertext + metadonnees (expiry, burn flag), endpoint public
3. Logique TTL : destruction automatique apres 10 min dans tous les cas, option "1 read" en plus
4. Lien partageable accessible par tous (y compris guests)

### Phase 6 — Teams + RBAC avance
1. Entites : Team, TeamMember, TeamInviteLink
2. Mecanisme d'invitation par lien (token unique)
3. Partage de ressources a l'equipe (relation shared_with_team)
4. Voters Symfony : Team Lead read/update/delete sur ressources equipe, soft-unshare
5. Tenant Tokens Meilisearch : scoping Public + Team + Prive par utilisateur

### Phase 7 — Tag Management + Admin
1. CRUD Admin sur tags : officialisation (`is_official`), badge UI
2. Fusion de tags : reassignation ressources + suppression source + sync Meilisearch
3. Index Meilisearch `tags` pour autocompletion
4. Dashboard admin (stats, moderation contenu public)

### Phase 8 — Polish + Production
1. Dashboard utilisateur (summary cards, recent activity, quick access)
2. Barre de recherche globale (Cmd+K) avec dropdown resultats Meilisearch
3. Notifications
4. SSR Angular pour SEO des pages publiques
5. Tests (PHPUnit + Cypress/Playwright)
6. CI/CD + deploy sur VPS

## Langue

Les specifications (CC.md) sont redigees en francais.
