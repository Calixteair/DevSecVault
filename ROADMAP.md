# ROADMAP — Ouverture publique de DevSecVault

> Objectif : passer DevSecVault d'une plateforme **mono-utilisateur (privée)** à une plateforme **publique avec inscription libre**, sans exposer le mainteneur à des risques juridiques (LCEN, DSA, RGPD), opérationnels (abus, DoS, spam) ou techniques (élévation de privilèges, fuite de données).
>
> État actuel : signup Keycloak désactivé (`registrationAllowed: false`). Cible : signup ouvert avec garde-fous.
>
> Date d'ouverture cible : **non datée**, ouverture conditionnée à la complétion du Lot 4 + Lot 0.

---

## Principes directeurs

1. **Le mainteneur reste éditeur** : aucun contenu `visibility=public` créé par un non-admin n'est visible publiquement sans validation a posteriori (modération sous 24h après signalement).
2. **Aucune élévation possible** : un compte signup arrive avec `ROLE_USER` strict, jamais `ROLE_ADMIN` (déjà garanti par `KeycloakUserProvider::loadUserFromClaims`).
3. **Tout contenu illégal/abusif est retirable en 1 clic** par l'admin (modération a posteriori + bouton Report).
4. **Pas d'effet de bord sur l'existant** : la prod actuelle continue de tourner. Chaque lot mergeable indépendamment, déploiement progressif.
5. **Pas de dépendances externes payantes** : tout doit tourner sur la stack VPS existante (Keycloak, mailcow, Docker Compose).

---

## Vue d'ensemble — 5 lots

| Lot | Titre | Effort | Dépendances | Priorité |
|-----|-------|--------|-------------|----------|
| 1 | Quick wins infra | ~2h30 | Aucune | P0 |
| 2 | Rate-limit + quotas | ~3h | Lot 1 | P0 |
| 3 | Purge expirations (Ofelia) | ~1h | Aucune | P1 |
| 4 | Modération + légal + Report | ~6h | Lot 1, Lot 2 | P0 |
| 0 | Signup Keycloak (activation) | ~1h10 | Tous les autres | P0 (DERNIER) |

**Total** : ~13h40, soit ~2 jours de dev concentrés.

**Ordre recommandé** : 3 → 1 → 2 → 4 → 0.

> Lot 3 en premier car indépendant, court, échauffement. Lot 0 obligatoirement en dernier — l'activation du signup ne se fait QUE quand tous les autres lots sont mergés et déployés en prod.

---

## Lot 1 — Quick wins infra

**But** : durcir la stack avant d'augmenter la surface d'attaque. Aucun impact fonctionnel.

### 1.1 Limites de taille TEXT (Doctrine)

- **Fichiers** : `backend/src/Entity/Snippet.php`, `Payload.php`, `Vault.php`, `SecretLink.php`
- **Action** : ajouter `#[Assert\Length(max: N)]` sur tous les champs `Types::TEXT`
  - `Snippet.code` : 200 KB (200_000 caractères)
  - `Payload.body_encrypted` : 1 MB (déjà limité côté controller, on aligne au modèle)
  - `Vault.ciphertext` : 1 MB (idem)
  - `SecretLink.ciphertext` : 1 MB (idem)
- **Critère acceptation** : POST avec body > limite renvoie 400 avec message clair.

### 1.2 Headers de sécurité Nginx (frontend)

- **Fichier** : `docker/node/nginx.prod.conf`
- **Ajout** :
  ```nginx
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
  add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://vaultapi.calixteair.fr https://auth.calixteair.fr https://search.calixteair.fr; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
  add_header Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=()" always;
  add_header Cross-Origin-Opener-Policy "same-origin" always;
  ```
- **Critère acceptation** : `curl -I https://vault.calixteair.fr` montre tous les headers. Score Mozilla Observatory ≥ B.

### 1.3 Nginx api : `client_max_body_size` + `limit_req`

- **Fichier** : `docker/nginx/api.conf`
- **Ajouts** :
  - `client_max_body_size 2M;` (couvre le 1 MB de ciphertext + headers)
  - Zone `limit_req_zone` globale + `limit_req` sur `/api/auth/*` et `/api/secret-links` (10 req/s par IP, burst 20)
  - Headers de sécu identiques au front
- **Critère acceptation** : POST > 2 MB renvoie 413. 50 req/s sur `/api/secret-links` depuis une seule IP → 503.

### 1.4 USER non-root dans Dockerfile.prod PHP

- **Fichier** : `docker/php/Dockerfile.prod`
- **Action** : créer user `app` (UID 1000), `chown -R app:app /var/www/html`, ajouter `USER app` avant `CMD`
- **Vérifier** : Symfony console + cache write toujours OK
- **Critère acceptation** : `docker exec dsv-php whoami` retourne `app`, app fonctionne.

### 1.5 Trivy en CI

- **Fichier** : `.github/workflows/build-and-push.yml`
- **Ajout** : étape `aquasecurity/trivy-action@master` après chaque `docker/build-push-action`
  ```yaml
  - name: Scan with Trivy
    uses: aquasecurity/trivy-action@master
    with:
      image-ref: ${{ env.IMAGE_NAME }}
      severity: HIGH,CRITICAL
      exit-code: 1
      ignore-unfixed: true
  ```
- **Critère acceptation** : un push avec une CVE HIGH/CRITICAL fait échouer le job. Sortie publiée dans les logs Actions.

### Commits Lot 1 (5 commits courts)

```
chore(security): limites de taille sur champs TEXT
chore(security): headers CSP/HSTS sur nginx front
chore(security): client_max_body_size et limit_req nginx api
chore(docker): user non-root dans php prod
ci: scan trivy sur images docker
```

---

## Lot 2 — Rate-limit + quotas

**But** : empêcher les abus volumétriques (spam, DoS, bot signup, énumération).

### 2.1 Rate-limiters Symfony

- **Fichier** : `backend/config/packages/rate_limiter.yaml`
- **Ajouts** (sliding_window à chaque fois) :
  - `signup_ip` : 5/h par IP
  - `secret_link_create` : 30/h par user, 50/h par IP guest
  - `vault_create` : 60/h par user
  - `search_token` : 120/h par user
  - `report_submit` : 5/h par IP
- **Application** : injecter `RateLimiterFactory` dans les controllers concernés, retourner 429 + `Retry-After` si dépassé.
- **Critère acceptation** : test manuel curl > limite → 429.

### 2.2 Quotas par utilisateur

- **Fichier** : nouvelle table `user_quota` ou colonnes sur `User` (constantes en config plutôt que table).
- **Limites par défaut** :
  - `MAX_CONCEPTS_PER_USER = 100`
  - `MAX_SNIPPETS_PER_CONCEPT = 20`
  - `MAX_PAYLOADS_PER_USER = 100`
  - `MAX_VAULT_ITEMS_PER_USER = 50`
  - `MAX_ACTIVE_SECRET_LINKS_PER_USER = 20`
  - `MAX_ACTIVE_TOKENS_PER_USER = 10` (déjà en place)
  - `MAX_TEAMS_PER_USER = 10` (déjà en place)
- **Application** : check dans chaque `Controller::create()` AVANT persist, renvoyer 422 avec message clair "Quota atteint, supprimez du contenu pour continuer".
- **Critère acceptation** : un user avec 100 concepts → 101e POST renvoie 422.

### Commits Lot 2 (2 commits)

```
feat(security): rate-limiters par endpoint sensible
feat(security): quotas par utilisateur sur ressources
```

---

## Lot 3 — Purge des expirations (Ofelia)

**But** : nettoyer SecretLink/Vault/ApiToken expirés sans cron sur l'hôte VPS, tout reste dans la stack.

### 3.1 Commande Symfony unifiée

- **Fichier** : `backend/src/Command/PurgeExpiredCommand.php`
- **Signature** : `app:purge-expired`
- **Logique** :
  - Supprime les `SecretLink` où `expires_at < NOW()` (TTL 10 min Secure Bridge)
  - Supprime les `Vault` items où `expires_at < NOW()`
  - Supprime les `ApiToken` où `expires_at < NOW() - INTERVAL '30 days'` (cleanup ancien)
- **Output** : ligne par catégorie : `SecretLink purged: 12`, `Vault purged: 3`, `ApiToken purged: 1`, `Total duration: 87ms`
- **Tests** : `PurgeExpiredCommandTest` avec fixtures.

### 3.2 Sidecar Ofelia dans compose

- **Fichier** : `deploy/vps/docker-compose.yml`
- **Ajout** :
  ```yaml
  ofelia:
    image: mcuadros/ofelia:latest
    container_name: dsv-ofelia
    depends_on: [php]
    restart: unless-stopped
    networks: [dsv-internal]
    command: daemon --docker
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    security_opt:
      - no-new-privileges:true
    read_only: true
  ```
- **Labels sur php** :
  ```yaml
  php:
    labels:
      ofelia.enabled: "true"
      ofelia.job-exec.purge.schedule: "@every 5m"
      ofelia.job-exec.purge.command: "php bin/console app:purge-expired"
  ```
- **Critère acceptation** : `docker logs dsv-ofelia` montre le job qui tourne toutes les 5 min sans erreur.

### Commits Lot 3 (1 commit)

```
feat: commande app:purge-expired et sidecar ofelia
```

---

## Lot 4 — Modération a posteriori + Report + Légal

**But** : permettre l'ouverture du `visibility=public` à tous, avec modération sous 24h après signalement, conforme DSA. Le gros morceau.

### 4.1 Entités

- **Nouvelle entité `Report`** (`backend/src/Entity/Report.php`)
  - `id` UUID, `target_type` enum (concept/snippet/payload), `target_id` UUID, `reporter_user_id` (nullable pour guests), `reporter_ip` (hash SHA-256), `reason` enum (illegal_content, malware_distribution, phishing, copyright, spam, csam, terrorism, other), `details` text(2000), `status` enum (pending/reviewed/dismissed/actioned), `created_at`, `reviewed_at` nullable, `reviewed_by_admin_id` nullable, `admin_notes` text nullable
- **Champ `moderation_status` sur Concept/Snippet/Payload** : enum `active` (par défaut) / `flagged` / `hidden` / `removed`
- **Migration** : `php bin/console make:migration` → review → `doctrine:migrations:migrate` en prod via SSH

### 4.2 API

- **`POST /api/reports`** (PUBLIC_ACCESS, rate-limit 5/h/IP)
  - Body : `{ target_type, target_id, reason, details? }`
  - Stocke le hash de l'IP du reporter (pas l'IP en clair, RGPD)
  - Renvoie 201 avec `report_id`
- **`GET /api/admin/reports?status=pending`** (ROLE_ADMIN)
- **`POST /api/admin/reports/{id}/resolve`** (ROLE_ADMIN)
  - Body : `{ action: dismiss | hide | remove | ban_user, notes? }`
  - `hide` : `moderation_status=hidden` (auteur peut encore voir)
  - `remove` : `moderation_status=removed` (soft-delete, gardé pour preuve légale 1 an)
  - `ban_user` : désactive le compte Keycloak via API admin
- **Voters** : si `moderation_status != 'active'` → invisible pour tous sauf auteur et admin

### 4.3 Frontend

- **Bouton Report** sur tout `Concept`/`Snippet`/`Payload` public
  - Composant `ReportDialogComponent` avec select reason + textarea details
- **Page admin Reports** (route `/admin/reports`)
  - Liste pending avec preview du contenu signalé inline
  - Boutons d'action (Dismiss / Hide / Remove / Ban)
- **Pages légales statiques** (Angular routes publiques)
  - `/legal/terms` (CGU)
  - `/legal/privacy` (Politique de confidentialité RGPD)
  - `/legal/notice` (Mentions légales)
  - `/legal/abuse` (procédure de signalement DSA, contact `dsvabuse@calixteair.fr`)
- **Footer** : liens vers les 4 pages légales (visible sur toutes les pages)

### 4.4 Thème Keycloak — case CGU

- **Fichier** : `keycloak-theme/devsecvault/login/register.ftl`
- **Ajout** : checkbox obligatoire "J'accepte les CGU et la politique de confidentialité" avec liens vers `/legal/terms` et `/legal/privacy`
- **Stockage** : `user.attributes.acceptedTerms` + `user.attributes.acceptedTermsAt` (timestamp)

### 4.5 Contenus légaux à rédiger

Brouillons générés avec disclaimer "à faire relire par juriste avant ouverture publique" :

- **CGU** : objet du service, comptes, contenus interdits (malware fonctionnel ciblé, phishing, contenu pédopornographique/terroriste, copyright), responsabilité éditoriale (mainteneur n'est pas l'auteur des contenus user, mais retire sous 24h après signalement), résiliation, droit applicable français.
- **Politique de confidentialité** : données collectées (email, IP hashée des reports, contenu créé), finalité, durée conservation (compte actif + 30j après suppression, reports 1 an), droits RGPD (accès/rectification/effacement), DPO (toi), base légale (intérêt légitime + consentement).
- **Mentions légales** : éditeur (toi en ton nom propre, pas d'entreprise), hébergeur (toi-même, VPS Hetzner ou autre), contact.
- **Procédure abuse** : email dédié `dsvabuse@calixteair.fr` (à créer côté mailcow), formulaire Report en ligne, engagement délai 24h ouvré.

### Commits Lot 4 (4 commits)

```
feat(moderation): entités Report et moderation_status
feat(moderation): API reports + résolution admin
feat(moderation): UI Report dialog et page admin
feat(legal): pages CGU/privacy/notice et case CGU Keycloak
```

---

## Lot 0 — Activation signup Keycloak

**À faire EN DERNIER**, après merge + déploiement de tous les autres lots.

### 0.1 SMTP Keycloak (via Mailcow VPS)

- **Stack mailcow** : `mail.calixteair.fr`, postfix interne, score mail-tester 10/10. Cf. [[vps-chantier-mailcow]].
- **À créer côté admin Mailcow (UI `mail.calixteair.fr`)** :
  - Mailbox applicatif `noreply@calixteair.fr` (mot de passe fort, mode SMTP only — pas d'IMAP/SOGo si possible)
  - Mailbox `dsvabuse@calixteair.fr` (boîte de signalement DSA, à monitorer manuellement ou via filtre SOGo)
- **Realm settings > Email Keycloak** :
  - Host : `mail.calixteair.fr` (port public, accessible depuis le réseau Docker DSV via le réseau `nginx-reverse-proxy` ou en direct)
  - Port : 587 (STARTTLS) ou 465 (SMTPS)
  - Encryption : STARTTLS recommandé
  - From : `noreply@calixteair.fr`
  - From display name : `DevSecVault`
  - Reply-To : `dsvabuse@calixteair.fr` (les users qui répondent atterrissent côté abuse box)
  - Auth : `noreply@calixteair.fr` + mot de passe (à stocker dans Symfony Secrets ou variable env Keycloak chiffrée)
- **Test** : envoi d'un email de reset password depuis console admin Keycloak vers une adresse externe.

> **Réseau** : Mailcow bind sur `0.0.0.0` pour ports SMTP standards (25/465/587), donc Keycloak peut taper directement `mail.calixteair.fr:587` depuis n'importe quel container/host. Pas besoin de réseau Docker partagé.

### 0.2 hCaptcha

- **Compte hCaptcha** (gratuit) : récupérer site key + secret key
- **Realm > Authentication > Flows > Registration** : ajouter exécution `reCAPTCHA` (compatible hCaptcha via override)
- **Site key/secret** dans Realm config

### 0.3 Activation realm settings

- `User registration: ON`
- `Email as username: ON`
- `Verify email: ON`
- `Forgot password: ON`
- `Login with email: ON`
- `Default roles : default-roles-devsecvault uniquement` (vérifier qu'il n'y a pas `admin`)

### 0.4 Brute-force protection

- `Realm settings > Security defenses > Brute force detection: ON`
- Max login failures : 5
- Wait increment : 60s
- Permanent lockout : OFF (sinon DoS via mail crafted)

### 0.5 Vérifications finales avant ouverture

- [ ] Lots 1-4 mergés en prod et stables depuis 7 jours
- [ ] Trivy CI vert sur le dernier build
- [ ] Test signup en local avec un email jetable → réception verify + login OK
- [ ] Test création Report en tant que guest → admin voit le report
- [ ] Test publication contenu malveillant simulé → Report → modération → contenu hidden en < 5 min
- [ ] Pages légales en ligne et accessibles
- [ ] Email `dsvabuse@calixteair.fr` actif et monitoré
- [ ] `realm.registrationAllowed: true` flippé

### Commits Lot 0 (config Keycloak, pas de code)

Le Lot 0 est principalement de la config Keycloak (pas de code commit). Le seul code commit éventuel concerne le thème si modifications post Lot 4.

---

## Critères de "ouverture safe" — checklist finale

Avant de flipper `registrationAllowed: true` en prod, **tous** les points doivent être verts :

- [ ] **Technique** : tous les lots 1-4 mergés, Trivy CI vert, healthchecks OK, purge tourne
- [ ] **Légal** : 4 pages légales en ligne, case CGU obligatoire à l'inscription, email abuse actif
- [ ] **Modération** : page admin Reports testée, action `remove` testée, audit trail (admin_notes) en place
- [ ] **Quotas** : tous les quotas testés, message d'erreur clair côté UI
- [ ] **Auth** : SMTP Keycloak fonctionnel, verify email obligatoire, hCaptcha actif, brute-force protection activée
- [ ] **Monitoring** : log Reports + log signups dans Wazuh ou logs centralisés (à voir avec stack SOC VPS)
- [ ] **Communication** : annonce de l'ouverture (réseaux ou cercle restreint au début)

---

## Hors scope (volontaire)

Ce qui **n'est PAS** dans cette roadmap et ne bloque PAS l'ouverture :

- Migration vers OpenBao (chantier séparé `vps-chantier-bao-migration`)
- Système de notifications en temps réel (Phase 8 du plan général)
- Recherche globale Cmd+K (Phase 8)
- 2FA utilisateur (à ajouter quand le service grossit, déjà supporté nativement par Keycloak)
- WAF type CrowdSec sur les endpoints DSV (déjà en place côté VPS via stack SOC, à connecter en bouncer NPM)
- Logs d'audit complets (qui a fait quoi, quand) — peut être ajouté plus tard

---

## Suivi

- Fiche wiki : [[devsecvault-opening-publique]] dans `/home/data/Obsidian/VaultKalixteair/wiki/entities/`
- Audit de référence : `SECURITY_AUDIT_REPORT.md` (avril 2026)
- Cahier des charges : `CC.md`
- Architecture : `CLAUDE.md`

**Statut courant** : roadmap rédigée, en attente démarrage Lot 3 (purge Ofelia).
