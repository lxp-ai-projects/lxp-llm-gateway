# Auth Implementation Plan

## Phase 1 Auth Tasks

1. add Redis-backed auth support to `admin-api`
2. implement `AuthService`
3. implement `POST /api/v1/auth/login`
4. implement `POST /api/v1/auth/refresh`
5. implement `POST /api/v1/auth/logout`
6. implement `GET /api/v1/auth/me`
7. add JWT guard and role guard
8. add `.http` queries for auth flows

## Required Runtime Configuration

- `REDIS_URL` or equivalent Redis host configuration
- JWT signing secret or key material
- cookie secret
- access token TTL
- refresh token TTL

## Testing Expectations

- unit tests for password verification and token issuance
- unit tests for blacklist behavior
- unit tests for refresh token rotation
- integration tests for login, refresh, logout, and protected route access
