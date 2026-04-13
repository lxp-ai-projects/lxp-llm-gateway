# ADR-002: Control Plane and Data Plane Separation

## Status

Accepted

## Decision

The platform separates control-plane administration concerns from data-plane gateway traffic concerns.

## Rationale

- administrative workflows evolve differently from request routing flows
- security boundaries are easier to reason about
- operational concerns remain clearer

## Consequences

- two backend applications must be maintained
- shared contracts must remain disciplined to avoid accidental coupling
