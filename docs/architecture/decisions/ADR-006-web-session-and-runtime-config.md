# ADR-006: Web Session and Runtime Configuration

## Status

Accepted

## Decision

The SPA uses backend-managed cookie sessions and runtime-discovered feature configuration.

Initial posture:

- `admin-web` is a single SPA for both admin and user experiences
- UI navigation is role-aware
- access token: `HttpOnly` cookie
- refresh token: `HttpOnly` cookie
- frontend does not read raw tokens
- frontend uses `credentials: 'include'` for authenticated API calls
- frontend resolves current session state through `GET /api/v1/auth/me`
- frontend resolves public feature switches through a dedicated public config endpoint

## Rationale

- this keeps browser token handling as austere as possible
- the SPA can still be reactive without copying tokens into memory or storage
- runtime feature flags avoid rebuilding the frontend for operational configuration changes
- role-aware navigation allows one SPA without pretending all users are administrators

## Public Runtime Config

The backend must expose a public configuration endpoint with the strict minimum needed to compose the application shell.

Initial public fields:

- registration enabled or disabled
- forgot password enabled or disabled
- gateway availability status
- supported provider list for UI composition if needed

The endpoint must not expose secrets, internal infrastructure details, or privileged operational settings.

## Session Flow

On successful login:

1. `admin-api` validates credentials
2. `admin-api` sets secure cookie(s) for access and refresh tokens
3. the SPA calls `GET /api/v1/auth/me`
4. the SPA renders role-appropriate navigation and routes

On refresh:

1. the SPA receives `401` or performs a proactive session check
2. the SPA calls `POST /api/v1/auth/refresh` with cookies included
3. `admin-api` rotates the refresh token server-side
4. `admin-api` updates the cookies

On logout:

1. the SPA calls `POST /api/v1/auth/logout`
2. `admin-api` revokes the active session state
3. `admin-api` clears the auth cookies
4. the SPA returns to the login route

## UI Role Model

Initial roles remain:

- `admin`
- `user`

Special rule:

- the bootstrap administrator is the primary admin
- the primary admin cannot be deleted
- the primary admin role can be transferred through an explicit dangerous action

## Circuit Breaker

The initial UI exposes a global gateway circuit breaker to administrators.

When enabled:

- `gateway-api` returns a service-offline error for user traffic
- the SPA surfaces a clear service unavailability state

Phase 1 does not include per-provider circuit breaking.

## Consequences

- `admin-api` must expose a small public runtime-config endpoint
- `admin-api` must fully support cookie-based auth flows for SPA use
- `admin-web` must treat session state as server-authoritative
- API clients outside the SPA may still use bearer-style flows separately if needed, but the browser app does not depend on them
