# ADR-003: Provider Adapter Seam

## Status

Accepted

## Decision

Provider integrations are implemented behind a shared adapter seam in `packages/provider-sdk`.

`gateway-api` depends on the seam, not on a concrete provider package.

## Rationale

- provider-specific logic must not leak into the gateway application
- additional providers should be addable without redesigning the gateway
- streaming and normalization behavior need a stable abstraction point

## Consequences

- the adapter contract must be kept intentionally small
- provider packages must absorb integration-specific complexity
