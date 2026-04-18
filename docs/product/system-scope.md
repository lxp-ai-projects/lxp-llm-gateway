# System Scope

## Goal

`lxp-llm-gateway` is a platform foundation for routing LLM traffic through a consistent gateway while keeping provider integrations isolated behind a stable adapter seam.

## In Scope

- LLM gateway API
- admin control-plane API
- admin web application
- shared contracts and domain packages
- provider abstraction package
- first provider integration for NanoGPT
- user, role, and provider credential foundations
- local development infrastructure
- foundational documentation and API contract placeholders
- incremental UI refactor work that keeps `admin-web` maintainable as feature depth increases

## Out of Scope for Phase 1

- additional providers
- billing and analytics
- quota enforcement
- policy engines
- event-driven workers
- advanced dashboards

## Phase 1 Success Criteria

- the monorepo structure is in place
- the apps and packages are operational, not placeholders
- the core architecture boundaries are documented
- the provider seam is explicit
- the repository is ready for iterative feature implementation
- the admin SPA remains operable on mobile and desktop without accumulating oversized, multi-responsibility modules as the feature surface grows

## Current End-of-Phase-1 State

The repository now contains:

- `admin-api` as the control-plane backend for auth, users, roles, provider credentials, runtime config, and conversation transfer support
- `gateway-api` as the data-plane backend for model listing, non-stream chat, and SSE chat streaming through the provider seam
- `admin-web` as a role-aware SPA with public auth surfaces, user self-service, admin management, and a local chat test surface
- Postgres-backed durable control-plane persistence
- Redis-backed auth and operational state where ephemeral behavior is appropriate
- one concrete provider integration, `NanoGPT`, implemented behind `packages/provider-sdk`

## Phase 2 Starting Assumptions

Phase 2 should assume:

- the provider seam is already the canonical integration boundary
- cookie-only browser auth is the expected SPA posture
- the SPA codebase is already organized by feature and can continue to evolve incrementally
- CI quality gates already cover typecheck, test, and build

Phase 2 should not spend time re-litigating those foundation choices unless a concrete failure mode appears.
