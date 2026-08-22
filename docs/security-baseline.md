# Security Baseline & Secret Encryption (WP 05)

Operator-facing knobs introduced by REQ-ELN-10 / REQ-ELN-5. With **none** of
these ENV variables set, behaviour is identical to before (shipped defaults).

## ENV knobs

| Variable | Default | Effect |
|---|---|---|
| `DEVISE_BCRYPT_COST` | 10 (1 in test) | bcrypt stretches for password hashes. Applies to new hashes only; existing hashes stay valid. |
| `DEVISE_PASSWORD_MIN_LENGTH` | 8 | minimum password length |
| `DEVISE_PASSWORD_MAX_LENGTH` | 72 | maximum password length |
| `DEVISE_MAXIMUM_ATTEMPTS` | 5 | failed logins before account lockout (`unlock_strategy: :time`, 10 min) |
| `JWT_TTL_HOURS` | 336 (= 2 weeks) | lifetime of API JWTs (`POST /api/v1/authentication/token`, `POST /api/v1/public/token`, GraphQL sign-in, OnlyOffice editor token). Read at call time — restart not required for new tokens. Note: before WP 05 the public/GraphQL/editor tokens silently defaulted to 6 months. |
| `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` | — | ActiveRecord::Encryption primary key (any long random string) |
| `ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT` | — | key derivation salt |
| `ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY` | — | optional; reserved (no deterministic encryption in use) |

All are **Absolute tier**: set per tenant stack in the tenant's `.env`,
never tenant-editable. Devise values are boot-time (restart to apply).

## Encrypted secret store (`matrice_secrets`)

Secrets that used to live in plaintext inside `matrices.configs` JSONB
(OmniAuth `client_secret`s, computedProp `hmac_secret`/`receiving_secret`,
fastInput `cas_api_key`) are stored encrypted in the `matrice_secrets` table
(non-deterministic ActiveRecord::Encryption). API responses only ever contain
the masked placeholder `********`; writing a new value through
`PUT /api/v1/admin/matrix` replaces the stored secret (write-only contract —
sending the placeholder back keeps the current secret).

Key handling:

- **Production**: generate keys once per tenant, e.g.
  `openssl rand -hex 32` for each of primary key and salt, and set the ENV
  variables above **before** storing any secret. Boot works without them; the
  first attempt to store a secret fails with a clear error.
- **Development/test**: if unset, stable keys are derived from
  `secret_key_base` automatically (logged at boot). Do not rely on this in
  production.

### DataCite/DOI credentials

`DATA_CITE_API_USERNAME` / `DATA_CITE_API_PASSWORD` (and the `DATA_CITE_*`
prefixes) are pure ENV reads (`lib/data_cite/client.rb`) — they are never
stored in the database, so no DB encryption applies. Treat them like the other
bootstrap secrets in the tenant `.env`.

## Migrating existing plaintext secrets

```bash
bundle exec rake secrets:migrate_matrices
```

Idempotent; also processes soft-deleted matrices; prints a summary and warns
about any record it could not migrate (those keep their plaintext configs and
should be fixed manually). Run it in the same rollout window as the Rails 7.2
cookie rotator (see upgrade notes).

## Key rotation (sketch)

1. Add the new key **in front**: ActiveRecord::Encryption supports a list of
   previous keys — set the new value in
   `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` and add the old one to
   `config.active_record.encryption.previous = [{ primary_key: '<old>' }]`
   (temporary initializer or ENV-driven extension of
   `config/initializers/active_record_encryption.rb`).
2. Restart, then re-encrypt: `MatriceSecret.find_each { |s| s.update!(secret: s.secret) }`
   (reads with old key via `previous`, writes with new key).
3. Remove the `previous` entry and restart.

The `key_derivation_salt` must stay constant unless you re-encrypt everything
in the same step. Losing both keys means losing the stored secrets — re-enter
them via the admin UI.
