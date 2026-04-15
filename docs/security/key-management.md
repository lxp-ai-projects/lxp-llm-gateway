# Key Management and Secure Configuration

## Goal

The platform should be easy to bootstrap locally without training operators into unsafe habits.

This guide defines what belongs in runtime configuration and what belongs in application data.

## Configuration vs Data

### Runtime Configuration

Runtime configuration is deployment-scoped and belongs in environment variables or secret managers.

Examples:

- database connection strings
- Redis connection strings
- cookie signing secrets
- encryption master keys
- JWT signing keys

### Application Data

Application data belongs in the database.

Examples:

- users
- roles
- provider definitions
- encrypted provider credentials

Provider API tokens that belong to a specific user or provider binding are application data and must be stored encrypted in the database.

## Required Runtime Secrets

The following server-side secrets should exist before credential storage is implemented:

- `LXP_ENCRYPTION_MASTER_KEY`
- `LXP_ENCRYPTION_KEY_VERSION`
- `LXP_EMAIL_LOOKUP_KEY`
- `LXP_COOKIE_SECRET`
- `LXP_JWT_PRIVATE_KEY` or equivalent auth secret material

## Master Key Format

Use a random 32-byte key for `AES-256-GCM`.

Recommended storage format:

- base64-encoded 32-byte key

Example generation approaches:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

```bash
openssl rand -base64 32
```

Do not commit generated key values to the repository.

Generate a separate base64 32-byte key for `LXP_EMAIL_LOOKUP_KEY`.

Do not reuse the encryption master key as the email lookup key.

## Local Development

For local development:

1. create a local `.env` file that is not committed
2. generate a dedicated local master key
3. generate a dedicated local email lookup key
4. set `LXP_ENCRYPTION_KEY_VERSION=1`
5. use disposable provider secrets in development only

This keeps onboarding simple while preserving the same security model used in production.

## Production Guidance

In production:

- store runtime secrets in a proper secret manager
- never rely on checked-in environment files
- rotate keys deliberately, not ad hoc
- keep key versions explicit
- ensure only backend services can access encryption material

Suitable secret backends include:

- GitHub Actions secrets for CI
- cloud secret managers
- container orchestration secret stores

## Key Rotation Model

The first implementation should support a single active key version plus metadata for future rotation.

Recommended posture:

- new writes use the active key version
- old records remain decryptable by their stored `keyVersion`
- a later re-encryption job can migrate old records to the new key

## Logging and Observability

Never log:

- raw provider API keys
- decrypted credential values
- master keys
- full credential payloads

If a credential event needs observability, log only:

- user or account identifier
- provider identifier
- credential record identifier
- success or failure outcome
- timestamp
