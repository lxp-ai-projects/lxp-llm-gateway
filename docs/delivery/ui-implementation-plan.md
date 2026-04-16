# UI Implementation Plan

## Goal

Deliver a mobile-first, role-aware SPA that is operationally useful for administrators and safe for end users.

## Phase 1 Delivery Slices

### Slice 1: Shell and Session

- add Mantine and theme foundation
- add app shell, sidebar, and mobile navigation
- add runtime config bootstrap
- add cookie-based session bootstrap through `/api/v1/auth/me`
- add protected and role-aware routes

### Slice 2: Public Auth Surface

- login page
- terms page
- privacy page
- conditional registration entry point
- conditional forgot-password entry point

### Slice 3: User Surfaces

- overview page
- provider credential management
- profile management
- simple chat page backed by IndexedDB

### Slice 4: Admin Surfaces

- user list with search and pagination
- create user
- activate and deactivate user
- assign roles
- admin-triggered password reset
- health view
- gateway analytics overview
- global circuit breaker control

## Backend Prerequisites

The following backend work should be present or scheduled before each UI slice is finalized:

- public runtime config endpoint
- cookie-only browser auth behavior
- role-aware `me` endpoint
- user management endpoints
- analytics endpoints
- circuit-breaker endpoints

## Risks

- building UI on placeholder endpoints will create rework
- cookie-only auth requires correct CORS and cookie posture early
- admin and user concerns can blur if navigation is not role-driven from the start
- provider-secret workflows must remain explicit about write-only vs reset-only behavior

## Acceptance Criteria

- the SPA renders correctly on mobile and desktop
- admins see admin routes and users do not
- disabled runtime features do not appear in public navigation
- browser auth works without exposing raw tokens to JavaScript
- chat reasoning appears when the selected provider/model emits it
- the gateway-offline state is visible and understandable
