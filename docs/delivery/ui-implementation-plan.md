# UI Implementation Plan

## Goal

Deliver a mobile-first, role-aware SPA that is operationally useful for administrators and safe for end users.

This document now serves as an implementation record and a Phase 2 handoff note, not only as a pre-build plan.

## Phase 1 Delivery Slices

### Slice 1: Shell and Session

- add Mantine and theme foundation
- add app shell, sidebar, and mobile navigation
- add runtime config bootstrap
- add cookie-based session bootstrap through `/api/v1/auth/me`
- add protected and role-aware routes

Status: delivered

### Slice 2: Public Auth Surface

- login page
- terms page
- privacy page
- conditional registration entry point
- conditional forgot-password entry point

Status: delivered

### Slice 3: User Surfaces

- overview page
- provider credential management
- profile management
- simple chat page backed by IndexedDB

Status: delivered, with streaming chat, conversation import/export, local system prompt support, and mobile-first chat ergonomics

### Slice 4: Admin Surfaces

- user list with search and pagination
- create user
- activate and deactivate user
- assign roles
- admin-triggered password reset
- health view
- gateway analytics overview
- global circuit breaker control

Status: delivered at Phase 1 depth

### Slice 5: UI Maintainability Pass

- refactor oversized UI files into smaller feature modules
- group UI code under `src/features/<feature-name>`
- separate transport concerns from page rendering
- separate chat orchestration from chat presentation
- introduce stable Playwright-oriented test anchors on key interactive controls
- preserve existing behavior while improving maintainability and testability

Status: substantially delivered

## Current Phase 1 Outcome

The UI now depends on working backend support for:

- public runtime config endpoint
- cookie-only browser auth behavior
- role-aware `me` endpoint
- user management endpoints
- analytics endpoints
- circuit-breaker endpoints

These are no longer just prerequisites; they are part of the current baseline.

## Risks

- building UI on placeholder endpoints will create rework
- cookie-only auth requires correct CORS and cookie posture early
- admin and user concerns can blur if navigation is not role-driven from the start
- provider-secret workflows must remain explicit about write-only vs reset-only behavior
- leaving large page or client files unrefactored will slow future delivery and make functional testing brittle

## Refactor Order

Recommended order for the maintainability pass:

1. document the target structure and selector policy
2. split `api-client.ts` into cohesive modules behind a stable facade
3. split `chat-page.tsx` into feature components and hooks
4. add `data-testid` only to stable interactive surfaces needed for functional tests
5. keep unit and component tests green after each extraction step
6. add direct tests on extracted feature hooks before reducing page-level coverage

This order has been followed in practice for:

- `api-client` transport split
- feature extraction under `src/features/*`
- hook extraction for chat, providers, and users
- selector stabilization for future E2E work

## Acceptance Criteria

- the SPA renders correctly on mobile and desktop
- admins see admin routes and users do not
- disabled runtime features do not appear in public navigation
- browser auth works without exposing raw tokens to JavaScript
- chat reasoning appears when the selected provider/model emits it
- the gateway-offline state is visible and understandable
- the UI codebase is prepared for future Playwright coverage with stable anchors on key user flows

These criteria are now substantially met for the implemented Phase 1 surface.

## Phase 2 Starting Point

Phase 2 can start from:

- a role-aware SPA already running on mobile and desktop
- a feature-oriented frontend structure
- high unit and component coverage
- CI quality gates for typecheck, test, and build

The next frontend priorities should focus on:

- Playwright and broader E2E coverage
- additional operational polish where needed
- extending existing feature modules rather than rebuilding their structure
