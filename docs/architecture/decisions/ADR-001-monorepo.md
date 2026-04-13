# ADR-001: Monorepo Workspace

## Status

Accepted

## Decision

The project uses a `pnpm` and `turbo` monorepo with separate application and package workspaces.

## Rationale

- shared contracts and domain types need a single source of truth
- application boundaries remain explicit
- incremental builds and task orchestration stay manageable

## Consequences

- repository tooling is slightly more complex up front
- cross-package boundaries are clearer and easier to enforce
