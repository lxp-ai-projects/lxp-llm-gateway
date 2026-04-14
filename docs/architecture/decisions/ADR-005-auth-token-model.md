# ADR-005: Authentication Token Model

## Status

Accepted

## Decision

The platform uses short-lived JWT access tokens and refresh tokens with server-side revocation support.

Initial token posture:

- access token TTL: 5 minutes
- refresh token TTL: 2 hours
- refresh token rotation: enabled
- revoked token tracking: Redis-backed blacklist

## Rationale

- short-lived access tokens reduce exposure if a token leaks
- refresh tokens allow practical session continuity without keeping access tokens long-lived
- server-side revocation is required for logout, compromise response, and rotation safety
- Redis is appropriate for token revocation and session-adjacent short-lived state

## Token Types

### Access Token

- JWT
- short TTL
- used to authorize API requests
- contains minimal claims required for request authorization

Suggested claims:

- `sub`: user id
- `jti`: token identifier
- `type`: `access`
- `roles`
- `iat`
- `exp`

### Refresh Token

- opaque or JWT-backed token payload with unique `jti`
- longer TTL than access token
- used only to obtain a new token pair
- rotated on refresh

Suggested claims or tracked fields:

- `sub`: user id
- `jti`: token identifier
- `type`: `refresh`
- `iat`
- `exp`

## Storage Rules

- access tokens must not be stored in `localStorage`
- refresh tokens must not be exposed to frontend JavaScript if a cookie-based flow is used
- the preferred posture is secure `HttpOnly` cookies for refresh tokens
- if access tokens are exposed to the SPA, they should remain in memory only

## Revocation and Blacklist

Redis stores revocation state for:

- explicitly logged-out access tokens until their expiry
- explicitly logged-out refresh tokens until their expiry
- rotated refresh tokens so they cannot be replayed

Suggested Redis key shape:

- `auth:blacklist:access:{jti}`
- `auth:blacklist:refresh:{jti}`

Suggested value:

- user id or session metadata

Suggested TTL:

- remaining token lifetime

## Rotation Rules

On successful refresh:

1. validate the presented refresh token
2. reject if blacklisted
3. blacklist the current refresh token `jti`
4. issue a new access token
5. issue a new refresh token

This makes refresh token replay detectable and bounded.

## Logout Behavior

On logout:

- blacklist the active access token until it expires
- blacklist the active refresh token until it expires
- clear the refresh cookie if cookies are used

## Consequences

- Redis becomes required for full auth behavior
- login, refresh, and logout must all be explicit server-side flows
- auth middleware must validate JWT signature and blacklist status
- token identifiers and session metadata must be modeled deliberately
