# Contributing to DevSecVault

Merci de l'intérêt que vous portez au projet ! DSV est un projet personnel
**non commercial** maintenu par un seul développeur, mais les contributions
externes sont les bienvenues.

## Avant de commencer

1. Lire le [cahier des charges (`CC.md`)](CC.md) pour comprendre le scope du
   projet
2. Lire les [conventions de développement (`CLAUDE.md`)](CLAUDE.md) pour le
   style de code, l'archi modulaire, et les patterns Symfony / Angular
3. Vérifier les [issues ouvertes](https://github.com/Calixteair/DevSecVault/issues)
   pour ne pas dupliquer un travail en cours

## Domaines où l'aide est particulièrement bienvenue

- 🌍 **Traductions** du theme Keycloak (FR/EN aujourd'hui, autres langues
  bienvenues — voir `keycloak-theme/devsecvault/login/messages/`)
- 🛠️ **Nouveaux outils dans IT Tools** : composants standalone Angular
  100 % côté navigateur (voir `frontend/src/app/features/it-tools/tools/`)
- 🐛 **Bug fixes** sur le code existant
- 🔍 **Audits de sécurité** : si vous trouvez une vuln, voir
  [`SECURITY.md`](SECURITY.md) (report par e-mail, pas en issue publique)
- 📚 **Documentation** : améliorer les README, exemples d'install, FAQ

## Workflow

1. **Fork** le repo et créez une branche depuis `master`
   - Format de nom : `feat/<sujet-court>`, `fix/<sujet-court>`, `docs/<sujet-court>`
2. **Codez** en suivant les conventions de `CLAUDE.md` :
   - Fonctions ≤ 30 lignes
   - Pas de `any` en TypeScript, types réels
   - Composants > 3 props liées → regroupez dans un objet
   - Async sans `try/catch` → ajoutez la gestion d'erreur
3. **Testez localement** avec la stack Docker (`docker compose up -d`)
4. **Commits** en français ou anglais, format
   [Conventional Commits](https://www.conventionalcommits.org/) :
   - `feat(scope): description`
   - `fix(scope): description`
   - `docs(scope): description`
   - `chore(scope): description`
5. **Pull request** vers `master` avec :
   - Description claire de ce qui change et pourquoi
   - Capture d'écran si UI
   - Mention de l'issue résolue le cas échéant

## Style de code

| Couche | Outil | Notes |
|--------|-------|-------|
| Frontend | Angular CLI / TypeScript strict | Signals préférés à RxJS quand possible, composants standalone |
| Backend | Symfony 8 / PHP 8.3 | controllers manuels (pas d'API Platform), Voters pour l'autorisation, Doctrine ORM |
| SPI Keycloak | Java 21 / Maven shade | provided dependencies sur Keycloak SPI, shade pour les deps tierces |

Lancez `/simplify` (si vous utilisez Claude Code) ou faites une revue manuelle
avant de soumettre une grosse PR.

## Tests

Le projet n'a pas encore de suite de tests automatisés (TODO Phase 8). En
attendant, **smoke-testez vos changements** :

- UI : ouvrez la page concernée dans le navigateur, vérifiez les flux nominal
  + erreur + edge case
- Backend : appelez l'endpoint avec curl ou Postman, vérifiez le body et le
  status code
- Auth : testez en guest **et** en utilisateur authentifié

## Licence

En contribuant, vous acceptez que votre code soit publié sous **licence MIT**
(voir [`LICENSE`](LICENSE)).

## Questions

- 💬 Discussions générales : [GitHub Discussions](https://github.com/Calixteair/DevSecVault/discussions)
- 🐛 Bugs : [GitHub Issues](https://github.com/Calixteair/DevSecVault/issues)
- 🔒 Sécurité : `dsvabuse@calixteair.fr` (voir `SECURITY.md`)
