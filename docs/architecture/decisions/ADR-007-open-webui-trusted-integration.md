# ADR-007: Open WebUI Trusted Integration Mode

## Status

Accepted

## Context

The repository supports a local Open WebUI integration through the gateway's OpenAI-compatible facade.

Open WebUI is useful as a trusted internal client, but it is not the source of truth for provider credentials, model access, or user attribution.

We need a deployment posture that keeps the gateway as the BYOK authority while still allowing Open WebUI to act as a UI client.

## Decision

Open WebUI is supported as a trusted internal client only.

The gateway may accept:

- a shared compatibility API key to authenticate Open WebUI as a client
- a forwarded user identity header such as `X-OpenWebUI-User-Email` only when the request arrives from a trusted deployment boundary

The gateway remains responsible for:

- resolving the effective user
- resolving provider credentials
- enforcing BYOK access
- attributing usage to the resolved gateway user

Open WebUI must not become a parallel security authority or a provider-credential store.

## Security Posture

Local development may use a direct trusted header flow.

Production deployments must:

- strip untrusted identity headers at the public edge
- inject trusted identity headers only from a reverse proxy or equivalent trusted ingress boundary
- keep Open WebUI to gateway traffic internal when possible
- avoid exposing the compatibility facade as a public API

## Consequences

- the gateway remains the canonical trust boundary for provider access
- Open WebUI can be used for practical operator workflows without teaching provider packages about Open WebUI
- production deployments need an explicit proxy or ingress design
- the trusted-header path is deliberate and bounded, not implicit

## Alternatives Considered

1. Trust Open WebUI headers directly from the public internet.
2. Let Open WebUI store provider credentials.
3. Require the gateway to accept arbitrary client-supplied identity claims.

All three would weaken the boundary or leak BYOK responsibilities away from the gateway, so they were rejected.

