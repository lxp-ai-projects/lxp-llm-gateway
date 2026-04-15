# Auth Implementation Plan

## Phase 1 Auth Tasks

1. add Redis-backed auth support to `admin-api` - completed
2. implement `AuthService` - completed
3. implement `POST /api/v1/auth/login` - completed
4. implement `POST /api/v1/auth/refresh` - completed
5. implement `POST /api/v1/auth/logout` - completed
6. implement `GET /api/v1/auth/me` - completed
7. integrate `gateway-api` with access-token verification and `emailHash` correlation - completed
8. add `.http` queries for auth flows - completed
9. add JWT guard and role guard for admin-only routes - pending

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

## Implemented Contract Notes

- `login` and `refresh` return only token material, not a user profile payload
- JWTs carry `emailHash` and roles
- `gateway-api` uses the access token instead of `x-user-id`
- provider credentials are still resolved server-side from the internal user record
