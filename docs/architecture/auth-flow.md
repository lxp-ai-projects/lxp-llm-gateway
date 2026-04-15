# Authentication Flow

## Goal

Provide practical operator login with a strong security posture and explicit revocation behavior.

## Initial Scope

The first authentication implementation should support:

- login
- refresh
- logout
- protected admin routes

## Login Flow

1. user submits email and password to `POST /api/v1/auth/login`
2. server normalizes the email and resolves the user by `emailHash`
3. server decrypts the stored email only when necessary for display or audit use, not for lookup
4. server verifies the password with Argon2id
5. server issues:
   - access token with 5-minute TTL
   - refresh token with 2-hour TTL
6. access and refresh tokens carry `emailHash`, not the raw email address
6. server records token identifiers for revocation-aware session handling

## Refresh Flow

1. client submits refresh token to `POST /api/v1/auth/refresh`
2. server validates signature and expiry
3. server checks Redis blacklist
4. server blacklists the current refresh token `jti`
5. server issues a fresh access token and refresh token

## Logout Flow

1. client calls `POST /api/v1/auth/logout`
2. server extracts current token identifiers
3. server blacklists both active token identifiers for their remaining TTL
4. server clears refresh cookie if used

## Authorization Flow

For protected admin endpoints:

1. server validates JWT signature
2. server validates token type is `access`
3. server checks Redis blacklist by `jti`
4. server resolves user context and roles
5. route guard enforces role requirements

For `gateway-api`:

1. gateway validates the access token signature
2. gateway validates token type is `access`
3. gateway reads `emailHash` from the token
4. gateway resolves the internal user by `users.email_hash`
5. gateway resolves the provider credential for that user and provider
6. gateway decrypts the provider API token only in memory for the outbound call

## Redis Responsibilities

Redis should hold:

- token blacklist entries
- refresh rotation invalidation state
- optional short-lived session metadata

Redis should not become the durable source of truth for users or roles.

## Security Rules

- never store access tokens in `localStorage`
- prefer `HttpOnly`, `Secure`, `SameSite` cookies for refresh tokens
- keep access tokens short-lived
- include `jti` in both access and refresh tokens
- never trust a valid signature alone without checking revocation state

## Recommended Endpoint Set

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Recommended Claims

### Access Token

- `sub`
- `emailHash`
- `jti`
- `type=access`
- `roles`
- `exp`

### Refresh Token

- `sub`
- `emailHash`
- `jti`
- `type=refresh`
- `exp`

## Operational Notes

- use a dedicated JWT signing secret or private key
- keep refresh token handling stricter than access token handling
- log auth outcomes, but never log raw tokens
- rate limiting should be added to login and refresh endpoints
- `emailHash` is a lookup/correlation claim, not a reversible encrypted field
