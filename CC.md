<div align="center">
  <h1>🛡️ Cahier des Charges : DevSecVault</h1>
  <p><i>Version 1.0 — Plateforme centralisée de savoir technique et d'outils cybersécurité</i></p>

  ![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=for-the-badge&logo=angular&logoColor=white)
  ![Symfony](https://img.shields.io/badge/Symfony-8-000000?style=for-the-badge&logo=symfony&logoColor=white)
  ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
  ![Keycloak](https://img.shields.io/badge/Keycloak-API-blue?style=for-the-badge&logo=keycloak)
  ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
</div>

---

## 📑 1. Présentation du Projet

**DevSecVault** est une plateforme web sécurisée auto-hébergée (VPS) conçue pour centraliser le savoir technique et les outils offensifs/défensifs des professionnels de la cybersécurité et des développeurs.

### 🎯 1.1 Objectifs
* 📚 **Centralisation :** Regrouper snippets, payloads et outils au même endroit.
* 🤐 **Sécurité "Zero-Knowledge" :** Garantir la confidentialité des secrets partagés (E2E).
* 👻 **Immunité Hébergeur :** Chiffrer les payloads stockés pour éviter les détections par les antivirus (AV) des VPS.
* ⚡ **Performance :** Indexation et recherche instantanée via Meilisearch.

---

## 🏗️ 2. Architecture Technique

### 🧩 2.1 Stack Logicielle
| Composant | Technologie | Détails |
| :--- | :--- | :--- |
| **🎨 Frontend** | **Angular 21** | Utilisation massive des Signals, composants Standalone et SSR. |
| **⚙️ Backend** | **Symfony 8** | API REST, PHP 8.3+, Architecture Hexagonale recommandée. |
| **🔐 IAM** | **Keycloak** | Déjà existant sur le VPS, gère l'Auth (OIDC). |
| **🔍 Recherche** | **Meilisearch**| Indexation vectorielle et textuelle rapide. |
| **🗄️ Base de données** | **PostgreSQL**| Stockage des données structurées et chiffrées. |
| **🌐 Proxy** | **Nginx** | Déjà existant sur le VPS, gère le SSL et le routage. |

### ☁️ 2.2 Déploiement & Infrastructure
* **Conteneurisation :** L'application est isolée dans ses propres conteneurs via Docker Compose.
* **Réseau :** Connexion au réseau externe du proxy Nginx et de Keycloak pour la communication inter-conteneurs.
* **Stockage :** Volumes persistants pour la base de données et les index Meilisearch.

---

## 🚀 3. Spécifications Fonctionnelles

### 💻 3.1 Module "Dev Library" (Snippets)
* **CRUD Personnel :** Gestion complète (Créer, Lire, Modifier, Supprimer) de ses propres snippets par les utilisateurs connectés.
* **Snippet Manager :** Stockage de fragments de code avec coloration syntaxique (Monaco Editor).
* **Versions :** Possibilité d'associer plusieurs langages à un même concept/algorithme.
* **Templating :** Définition de variables `{{NAME}}` remplacées côté client lors de la copie.

### ⚔️ 3.2 Module "Cyber Toolbox" (Scripts & Payloads)
* **CRUD Personnel :** Gestion complète de ses propres scripts et payloads.
* **Payload Repository :** Gestion de scripts offensifs et utilitaires d'administration.
* **Sécurité Anti-AV :** Chiffrement AES-256 (via Symfony) + Encodage Base64 avant écriture en DB.
* **Générateur de Commandes :** Interface réactive pour construire des commandes complexes (Nmap, MSFVenom) via des formulaires.

### 🌉 3.3 Module "Secure Bridge" (Secrets E2E)
* **Chiffrement de bout en bout (E2E) :** Utilisation de la **Web Crypto API** d'Angular. La clé est stockée dans le fragment d'URL (`#`) et n'est jamais envoyée au serveur.
* **Éphémérité :** Auto-destruction après lecture (*Burn-after-reading*) ou durée de vie limitée.
* **Confidentialité absolue :** Données exclues de l'indexation Meilisearch.

### 🧰 3.4 Module "ITTools" (Utilitaires)
* **Fonctionnalités :** Convertisseur de bases (Hex/Base64), Subnet calculator, JSON Validator/Formatter.
* **Exécution Zéro-Serveur :** 100% Client-side (Angular) pour garantir qu'aucune donnée ne quitte le navigateur.

### 🏷️ 3.5 Module "Tag Management" (Administration)
* **Tags Officiels :** Possibilité pour l'Admin de marquer des tags comme "officiels" (`is_official = true`). Ils seront mis en avant dans l'UI Angular avec un badge spécifique 🛡️.
* **Mécanisme de Fusion (Merge) :** Outil de nettoyage permettant de fusionner des tags similaires (ex: `js` vers `javascript`).
    *   **Backend (Symfony) :** Réaffectation de toutes les ressources au tag cible et suppression du tag source.
    *   **Synchronisation :** Mise à jour automatique de l'index Meilisearch après fusion.

---

## 🛡️ 4. Gestion des Droits et Accès (RBAC)

> 💡 **Note d'Architecture :** L'accès est segmenté par les rôles Keycloak et une gestion "Bypass" ultra-rapide pour les invités.

| Rôle | Accès & Permissions |
| :--- | :--- |
| 👻 **Invité (Guest)** | **Bypass Keycloak.** Accès en lecture seule aux ressources publiques uniquement. Recherche via Tenant Token restreint. |
| 👤 **User** | Connecté via Keycloak. **CRUD complet** sur ses propres ressources (Dev Library, Cyber Toolbox). Gestion de ses propres ressources privées. |
| 🤝 **Team Lead** | Partage et modération de ressources au sein d'un groupe/équipe. |
| 👑 **Admin** | Modération globale. **CRUD complet** sur le contenu public. **Gestion des tags** (Fusion, Officialisation). **Pas d'accès au contenu privé.** |

---

## 🔒 5. Protocoles de Sécurité (Data Flows)

### 🔄 5.1 Flux Cyber Toolbox (Chiffrement Serveur)
Empêche la détection par les outils de scan de l'hébergeur.
```text
[Angular (Clair)] ➡️ HTTPS ➡️ [Symfony (Chiffrement AES-256 + Base64)] ➡️ [Base de données]
```

### 🌉 5.2 Flux Secure Bridge (Chiffrement E2E)
Le serveur ne possède que le ciphertext, jamais la clé.
```text
1. [Angular] génère une clé locale.
2. [Angular] chiffre la donnée.
3. [Angular] envoie le ciphertext à [Symfony].
4. URL générée : [https://vault.com/secret/id#KEY](https://vault.com/secret/id#KEY)
```

---

## 🔍 6. Stratégie de Recherche (Meilisearch)
* **Direct Search :** Le client Angular interroge directement Meilisearch.
* **Tenant Tokens :** Symfony génère un JWT Meilisearch pour chaque utilisateur, limitant les résultats à ses droits (Public + Team + Privé).
* **Restrictions d'indexation :** Seules les métadonnées (titres, tags, descriptions) des payloads sont indexées pour sécuriser les fichiers d'index sur le disque.

---
