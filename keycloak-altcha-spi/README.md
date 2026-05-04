# keycloak-altcha-spi

Altcha proof-of-work captcha authenticator for Keycloak 26.5+, registration flow.

100% self-hosted, MIT-licensed widget, no third-party calls. Uses [altcha-lib-java](https://github.com/altcha-org/altcha-lib-java) for HMAC challenge generation and verification.

## Build

```bash
mvn clean package
# → target/keycloak-altcha-spi-1.0.0.jar (with altcha-lib shaded)
```

## Install

Drop the JAR into `/opt/keycloak/providers/`, restart Keycloak. The provider is auto-discovered via SPI ServiceLoader.

## Configure

In Realm > Authentication > Flows > registration, replace the `reCAPTCHA` execution with `altcha-registration` (REQUIRED). Configure:

- `hmacSecret`: HMAC-SHA-256 secret (from env `ALTCHA_HMAC_SECRET`)
- `cost`: PoW iterations (default 50000)
- `expiresInSec`: challenge TTL (default 600)
- `algorithm`: `SHA-256` (default)

The widget JS is served from the Keycloak theme `resources/js/altcha.min.js` (self-hosted, no CDN).

## License

ISC.
