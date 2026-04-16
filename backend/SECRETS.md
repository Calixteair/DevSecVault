# Symfony Secrets — Ops Notes

This app uses **Symfony Secrets** (Sodium-encrypted vaults, one per env) to
provision the `ENCRYPTION_KEY` consumed by `App\Security\PayloadCipher`
(Cyber Toolbox AES-256-GCM envelope).

## Vault layout

```
backend/config/secrets/
├── dev/
│   ├── dev.decrypt.private.php   # committed — dev convention
│   ├── dev.encrypt.public.php    # committed
│   └── dev.ENCRYPTION_KEY.*.php  # committed ciphertext
└── prod/
    ├── prod.decrypt.private.php  # NEVER committed (gitignored)
    ├── prod.encrypt.public.php   # committed
    └── prod.ENCRYPTION_KEY.*.php # committed ciphertext (once set on VPS)
```

## Local development (Docker)

Uses the plain-env shortcut — no vault needed. `ENCRYPTION_KEY` is read from
the repo-root `.env` and injected into the `dsv-php` container by
`docker-compose.yml`. Generate a new dev key with:

```bash
php -r "echo base64_encode(random_bytes(32));"
```

and paste it into `.env` (`ENCRYPTION_KEY=…`).

## Production (VPS)

Docker images don't ship the prod decrypt key. Bind-mount it from the host:

```yaml
# on the VPS, override docker-compose for the php service
services:
  php:
    volumes:
      - /home/calixteair/docker/DevSecVault/secrets/prod.decrypt.private.php:/var/www/backend/config/secrets/prod/prod.decrypt.private.php:ro
```

### One-time provisioning

1. Generate the prod keypair **on the VPS** (only if not already present):

   ```bash
   docker exec dsv-php php bin/console secrets:generate-keys --env=prod
   ```

   This creates `prod.encrypt.public.php` (commit this) and
   `prod.decrypt.private.php` (move to `/home/calixteair/docker/DevSecVault/secrets/`
   and bind-mount; never commit).

2. Set the encryption key:

   ```bash
   KEY=$(docker exec dsv-php php -r 'echo base64_encode(random_bytes(32));')
   echo -n "$KEY" | docker exec -i dsv-php php bin/console secrets:set ENCRYPTION_KEY - --env=prod
   ```

3. Commit the resulting `config/secrets/prod/prod.ENCRYPTION_KEY.*.php`
   file in the repo (it's Sodium-encrypted, safe to track).

### Rotation

`php bin/console secrets:set ENCRYPTION_KEY --env=prod` overwrites the cipher
entry. **Re-encrypting existing payloads is a data migration** — plan it
separately; the current cipher does not support multi-key reads.

## Fallback behaviour

If both the env var and the vault are empty, `PayloadCipher` throws on
construction, so the app fails fast rather than silently corrupting writes.
