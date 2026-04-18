# UI Architecture

## Scope

`admin-web` is the single SPA for Phase 1.

It serves two experiences through one shell:

- administrator control-plane experience
- end-user self-service experience

The visible navigation and screens vary by role.

## Stack

- React 19
- Vite
- React Router DOM
- TanStack Query
- Mantine as the primary UI foundation
- custom theme and tokens to avoid stock Mantine presentation

## Composition Model

The SPA is mobile-first and scales to desktop.

Primary shell:

- left sidebar on desktop
- drawer or collapsible navigation on mobile
- top app frame for session status and key actions

The target UI composition is feature-oriented.

The current direction in `admin-web/src` is:

- `features/auth`
- `features/chat`
- `features/providers`
- `features/users`

Page files may orchestrate feature modules, but they should not remain the long-term home for:

- transport clients
- streaming controllers
- IndexedDB persistence logic
- formatting helpers
- large blocks of repeated presentational markup

## Route Groups

### Public

- login
- terms of service
- privacy policy
- registration if enabled by runtime config
- forgot password if enabled by runtime config

### Authenticated User

- dashboard
- provider credentials
- profile management
- chat test surface

### Authenticated Admin

- all user routes
- user management
- gateway analytics
- health and operational status
- global circuit breaker

## Auth Model

The browser never needs direct access to raw JWT values.

The SPA uses:

- `credentials: 'include'`
- backend-managed `HttpOnly` cookies
- `/api/v1/auth/me` for current user resolution
- a public runtime-config endpoint for feature flags

The frontend stores only derived session state:

- authenticated or unauthenticated
- current user profile
- current role set
- runtime feature flags

## Navigation Rules

### Admin

Sidebar sections:

- overview
- users
- gateway analytics
- health
- provider credentials
- profile
- chat

### User

Sidebar sections:

- overview
- provider credentials
- profile
- chat

## Feature Areas

### Login

- email and password
- links to terms and privacy
- conditional registration link
- conditional forgot-password link

### User Management

Phase 1 includes:

- paginated list
- search and filter
- create user
- activate or deactivate user
- role assignment
- admin-triggered password reset

Primary-admin constraints are enforced by the backend and surfaced clearly by the UI.

### Provider Credentials

Phase 1 rules:

- users manage their own credentials
- admins may create a provider credential for another user
- admins may reset another user's provider credentials
- admins may not read or edit another user's existing secret values

### Chat

Phase 1 chat is a lightweight provider test surface.

- no server-side history persistence
- local browser persistence through IndexedDB
- simple conversation list per browser context
- reasoning is shown when the selected model exposes thinking output

### Analytics

Phase 1 admin analytics focuses on gateway adoption and system posture:

- total users
- active users
- users with at least one active provider credential
- distinct gateway users over 24h and 7d
- request volume over 24h and 7d
- circuit-breaker status

## Client Data Strategy

### Server Data

Use TanStack Query for:

- session state
- runtime config
- user lists
- provider metadata
- analytics
- health status

### Local Data

Use IndexedDB for:

- chat drafts
- lightweight local conversation history
- local UI preferences that are not security sensitive

Do not store auth tokens in IndexedDB.

## Refactor Posture

As the UI grows, refactor toward SRP-first modules instead of adding more responsibility to already large files.

Preferred direction:

- thin page components
- feature-specific hooks for orchestration
- API code separated from view logic
- shared presentational components only when duplication is real and stable

Current high-value refactor targets include:

- remaining chat orchestration inside `src/pages/chat-page.tsx`
- remaining page-level orchestration in `providers` and `users`
- stabilization of Playwright anchors on critical flows

These should be split incrementally without changing user-visible behavior first.

## Browser Automation Selectors

Phase 1 should prepare the SPA for future Playwright coverage.

Use a minimal `data-testid` convention only where semantic queries are likely to be unstable or ambiguous.

Recommended format:

- `feature-element-action`

Examples:

- `chat-send-button`
- `providers-save-credential`
- `users-create-submit`
- `auth-login-submit`

Do not blanket every DOM node with test attributes.

Prefer them for:

- buttons and interactive controls
- repeated list items with dynamic content
- modals and drawers
- page-level anchors that functional tests need to await reliably

## Design Direction

The UI should feel enterprise-grade without looking like a default component demo.

Principles:

- dense but readable information layout
- strong hierarchy and navigation clarity
- explicit status surfaces for health, auth, and gateway availability
- restrained motion
- custom Mantine theme tokens for spacing, color, typography, and states

## Backend Dependencies

Before full UI implementation, the backend contract must support:

- public runtime config endpoint
- cookie-based login, refresh, logout, and session resolution
- user management endpoints
- analytics endpoints
- health endpoints
- circuit-breaker endpoints
- provider credential management endpoints with the required security rules
