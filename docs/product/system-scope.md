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

## Out of Scope for Phase 1

- additional providers
- billing and analytics
- quota enforcement
- policy engines
- event-driven workers
- advanced dashboards

## Phase 1 Success Criteria

- the monorepo structure is in place
- all apps and packages build as placeholders
- the core architecture boundaries are documented
- the provider seam is explicit
- the repository is ready for iterative feature implementation
