# Architecture Overview

## System Context

The platform separates the data plane from the control plane.

- `admin-web` talks to `admin-api`
- clients talk to `gateway-api`
- `gateway-api` talks to provider adapters through `provider-sdk`
- `provider-nanogpt` is the first concrete provider implementation

## Boundary Rules

### Data Plane

`gateway-api` handles request intake, provider dispatch, streaming, and normalized response delivery.

It must not import provider-specific implementation details directly.

### Control Plane

`admin-api` manages authentication, provider credentials, and administrative settings.

`admin-web` is the operator-facing interface for those control-plane workflows.

### Shared Packages

- `contracts` contains transport-layer contracts
- `domain` contains framework-agnostic domain concepts
- `provider-sdk` defines the provider integration seam
- `provider-nanogpt` implements NanoGPT behind the seam

## Persistence Posture

Phase 1 may use Redis or Valkey for lightweight operational state.

Relational persistence is intentionally deferred until audit, metadata, and workflow requirements justify it.

Provider credentials are the exception to lightweight temporary state. They should be treated as durable encrypted application data and designed toward relational persistence from the beginning.

## Security Posture

The initial architecture assumes:

- secure admin authentication
- encrypted provider credentials
- clear identity boundaries
- no unsafe browser token storage patterns
- application-level encryption for stored provider API secrets
- short-lived access tokens with server-side revocation support

## Primary Risk

The main architectural failure mode is leaking provider-specific logic into `gateway-api`.

If that boundary collapses, the new repository will recreate the coupling problems it was meant to eliminate.
