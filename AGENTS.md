# AGENTS.md

## Purpose

This repository is a clean-slate foundation for a multi-provider LLM gateway platform.

All contributors and agents should preserve the intended architectural seams instead of optimizing for short-term convenience.

## Non-Negotiable Boundary

`apps/gateway-api` must not depend directly on provider-specific implementation details.

All provider integrations must remain behind the seam defined in `packages/provider-sdk`.

`packages/provider-nanogpt` is an implementation module, not a dependency to bleed through the gateway boundary.

## Working Style

- prefer minimal, explicit design over speculative abstraction
- keep documentation aligned with implementation
- distinguish clearly between fact, assumption, and future intent
- treat security and architecture as first-class concerns
- avoid introducing new packages without a concrete need

## Delivery Posture

During Phase 1, prioritize:

- repository structure
- clean contracts
- provider seam integrity
- basic local operability
- documentation that stays truthful

Avoid prematurely adding:

- extra providers
- quota or policy engines
- event subsystems
- analytics layers
- ornamental abstractions

## Documentation Rule

When architecture, boundaries, or delivery direction changes, update:

- `docs/SCOPE.md`
- `docs/product/system-scope.md`
- `docs/architecture/overview.md`
- relevant ADRs
