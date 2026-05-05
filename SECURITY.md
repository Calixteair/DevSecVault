# Security Policy

## Reporting a vulnerability

If you believe you've found a security issue in DevSecVault, please **do not**
open a public GitHub issue.

Instead, send a detailed report to **dsvabuse@calixteair.fr**. Include:

- A description of the vulnerability and the affected component (frontend,
  backend, Keycloak SPI, infra…)
- Steps to reproduce, ideally with a minimal proof of concept
- The version / commit hash you tested against
- Your assessment of impact and severity

You'll receive an acknowledgement within **72 hours** and a status update
within **7 days**. Reports are handled in good faith and confidentially.

## Scope

In scope:

- The hosted instance at `https://vault.calixteair.fr` (live demo)
- Source code in this repository (frontend, backend, Keycloak SPI, theme,
  Docker / infra configs)

Out of scope:

- Keycloak itself (report to https://github.com/keycloak/keycloak)
- Third-party dependencies (Symfony, Angular, libraries) — please report
  upstream first, then notify us if you need a coordinated patch
- Denial-of-service via traffic floods, brute force on registration without
  rate-limit bypass
- Self-XSS that requires a user to inject their own payload into their own
  account
- Issues only reproducible on outdated browsers (older than the latest two
  major versions of Firefox / Chrome / Safari)

## Disclosure

We aim for **coordinated disclosure**. Once a fix is shipped:

1. We credit the reporter in the commit message and `CHANGELOG.md` (unless
   they prefer to stay anonymous).
2. After 30 days (or sooner with reporter agreement), the issue can be
   discussed publicly.

DevSecVault is operated as a **non-commercial individual project**. We do not
run a paid bug bounty, but we acknowledge every valid report and take security
seriously.
