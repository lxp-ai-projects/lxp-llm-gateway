# ADR-008: Open WebUI Identity Strengthening Path

## Status

Accepted

## Context

The current Open WebUI integration supports:

- a tenant-scoped API key for an `integration_client` that represents `Open WebUI` as an internal client
- optional trusted user correlation through `X-OpenWebUI-User-Email`
- explicit trust-boundary controls in `gateway-api`
- audit attribution to the resolved gateway user

That posture is acceptable for local development and for bounded trusted deployments.

It is not the strongest long-term production posture because the forwarded identity is still a plain header, even if it is trusted only inside a controlled deployment boundary.

## Decision

The preferred long-term production path is:

1. authenticate the human user through `OIDC`, `proxy-auth`, or another strong external identity boundary
2. keep `Open WebUI` as a UI and protocol client only
3. keep `gateway-api` as the BYOK and provider-access authority
4. allow user correlation only inside that authenticated trusted boundary
5. preserve a simple fallback shared-user mode for local labs and non-correlated compatibility use cases

In that target posture:

- the public caller never sends effective gateway identity claims directly
- the technical client is authenticated first through its tenant-scoped API key
- the trusted deployment path establishes identity first
- `Open WebUI` forwards only trusted, deployment-owned identity context
- `gateway-api` resolves the existing gateway user and attributes provider usage to that user

## Non-Goals

This decision does not require:

- shared browser sessions between `admin-web` and `Open WebUI`
- provider packages to learn anything about `OIDC`, proxies, or `Open WebUI`
- `gateway-api` to become an identity provider

## Consequences

- the provider seam stays clean
- the compatibility facade remains a gateway concern only
- the current trusted-header mode remains valid as an intermediate deployment posture
- future production deployments have a clear migration path away from relying on a plain forwarded email header alone

## Target Deployment Shapes

### Proxy-Auth Shape

- a reverse proxy or auth gateway authenticates the user
- the proxy strips public identity headers
- the proxy or trusted application boundary injects authenticated user identity
- `Open WebUI` and `gateway-api` remain on a trusted internal path
- `gateway-api` accepts only the configured trusted header names and rejects conflicting trusted identity values

### OIDC-Backed Shape

- `Open WebUI` authenticates the user through OIDC
- `Open WebUI` forwards user context only from its authenticated session
- `gateway-api` still treats that forwarded identity as valid only in trusted mode

## Alternatives Considered

1. Keep the plain forwarded email header as the final production model.
2. Let `Open WebUI` become the source of truth for user-to-provider access.
3. Push stronger identity logic into provider packages.

All three were rejected because they either weaken the trust boundary or pollute the provider seam.
