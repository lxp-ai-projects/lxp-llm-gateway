# ADR-004: Provider Credential Security Model

## Status

Accepted

## Decision

Provider API credentials are treated as tenant or user-owned secrets, not as shared infrastructure configuration.

They must not be stored in plain text and must not be stored in `.env` files when they are specific to a user, account, or provider binding.

The platform stores provider credentials encrypted at rest using application-level encryption.

## Rationale

- provider credentials are business data, not deployment-only configuration
- a single shared `.env` secret does not model per-user or per-provider ownership correctly
- storing provider credentials in plain text would be an unacceptable privacy and security failure
- application-level encryption keeps the database unusable as a secret source without the runtime master key

## Encryption Approach

The platform uses symmetric authenticated encryption:

- algorithm: `AES-256-GCM`
- a master encryption key is supplied to the server runtime by secure configuration
- the database stores encrypted payload material only

Stored credential records must include:

- `ciphertext`
- `iv`
- `authTag`
- `keyVersion`
- metadata required to resolve ownership and provider identity

The runtime decrypts credentials only when needed for an outbound provider call.

## Boundary Rules

- frontend clients never receive provider API secrets
- admin APIs may create, rotate, revoke, or replace secrets, but must never return raw secret values after write
- gateway APIs may resolve and decrypt a provider credential only within a server-side execution path
- logs must never contain raw provider tokens

## Consequences

- a master key lifecycle must exist from day one
- credential storage requires a dedicated crypto service
- the database becomes an encrypted secret store, not a plain configuration table
- key rotation must be designed for, even if the first implementation is minimal
