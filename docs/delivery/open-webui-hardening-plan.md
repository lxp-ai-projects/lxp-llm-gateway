# Open WebUI Hardening Plan

## Goal

Harden the Open WebUI integration without weakening the provider seam.

The target posture is:

- Open WebUI remains a UI and protocol client only
- `gateway-api` remains the BYOK, identity-correlation, and usage-attribution authority
- provider packages stay unaware of Open WebUI and continue to live behind `packages/provider-sdk`

## Current Baseline

Today the repository already supports:

- a local Open WebUI integration through the OpenAI-compatible facade
- a shared compatibility API key for Open WebUI as an internal client
- optional per-request user correlation through `X-OpenWebUI-User-Email`
- local compose guidance and a VPS-oriented deployment guide

The current gap is not basic functionality.

The gap is that production hardening is mostly documented, but not yet fully expressed in runtime controls, deployment constraints, and operator-facing guidance.

## Implementation Status

- Slice 1 is implemented:
  - `gateway-api` now requires `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true` before accepting a forwarded Open WebUI identity header
  - compatibility requests without that mode fall back to the configured default user or fail if a trusted header is presented out of mode
- Slice 2 is implemented:
  - gateway chat audit events now include `resolvedUserUuid` and `identitySource`
  - compatibility auth emits structured audit events for identity resolution and compatibility-request acceptance
  - the new logs use user fingerprints and resolved gateway UUIDs, not raw provider secrets
- Slice 3 is now documented concretely:
  - VPS setup docs now define the reverse-proxy contract explicitly
  - repository examples show public-edge header stripping for `Caddy` and `Nginx`
  - the supported trust chain is now written down as `public proxy -> trusted Open WebUI deployment -> gateway-api`
- Slice 4 is now documented concretely:
  - local and deployed Open WebUI env examples are now separate
  - local and deployed gateway compatibility profiles are now separate
  - deployed Open WebUI compose now defaults `BYPASS_MODEL_ACCESS_CONTROL` to `false`
- Slice 5 remains planned work

## Recommended Delivery Order

### Slice 1: Gateway Trust Boundary

Objective:

- make trusted Open WebUI correlation an explicit runtime mode, not just a convention

Tasks:

- add an explicit compatibility trust mode for the OpenAI-compatible facade
- reject or ignore forwarded identity headers when the request does not arrive through the trusted integration path
- distinguish clearly between:
  - browser or public caller auth
  - compatibility client auth
  - trusted forwarded identity correlation

Expected outcome:

- the gateway will not accept arbitrary caller-supplied identity headers just because the compatibility key is present

### Slice 2: Usage Attribution and Audit

Objective:

- make the resolved gateway user visible in operational traces

Tasks:

- ensure usage tracking is recorded against the resolved gateway user, not just the transport caller
- add structured audit logging for:
  - compatibility request accepted
  - trusted identity correlation applied
  - fallback compatibility user used
  - provider and model resolved
- confirm secrets and provider credentials never appear in logs

Expected outcome:

- operator audit trails explain who actually consumed provider access

### Slice 3: Reverse Proxy Contract

Objective:

- make the production trust boundary concrete

Tasks:

- document required proxy behavior for public deployments
- strip user identity headers at the public edge
- inject trusted identity headers only after the user is authenticated by the proxy or Open WebUI trusted deployment
- keep `Open WebUI -> gateway-api` traffic internal when possible
- keep the compatibility endpoints off the public internet when possible

Expected outcome:

- production deployments have a concrete proxy contract instead of an implied one

### Slice 4: Local vs Production Runtime Profiles

Objective:

- prevent local-dev assumptions from silently becoming production defaults

Tasks:

- separate local and production config examples
- make local trusted-header behavior explicit in docs and env examples
- make production requirements explicit in docs and deployment examples
- review whether `BYPASS_MODEL_ACCESS_CONTROL=true` should remain enabled only for local or also for trusted internal production deployments

Expected outcome:

- operators can tell which settings are acceptable only in local labs

### Slice 5: Identity Strengthening

Objective:

- reduce reliance on a plain forwarded email header over time

Tasks:

- add a deployment path based on OIDC or proxy-auth
- keep email correlation only inside that trusted authenticated boundary
- decide whether the gateway should later require a stronger signed identity assertion than a plain header

Expected outcome:

- production correlation is grounded in authenticated identity, not just transport trust

## Work Breakdown by Layer

### `gateway-api`

Implementation focus:

- compatibility auth mode boundaries
- trusted-header acceptance rules
- fallback-user behavior clarity
- audit and usage attribution
- explicit documentation of public vs trusted caller expectations

Suggested first changes:

1. add a runtime switch that enables trusted-header correlation only in trusted mode
2. centralize the acceptance rules in `GatewayAuthService`
3. add focused tests for:
   - compatibility key only
   - compatibility key plus trusted header in trusted mode
   - compatibility key plus header in untrusted mode
   - fallback default user behavior

### Infrastructure

Implementation focus:

- reverse proxy stripping and injection
- internal-only network path between Open WebUI and gateway
- secret handling and rotation

Suggested first changes:

1. add a proxy-ready deployment example for Caddy or Nginx
2. document header stripping and reinjection explicitly
3. keep the Open WebUI container bound to localhost or an internal network in VPS examples

### Documentation

Implementation focus:

- make operator decisions obvious
- keep local and production guidance separate
- keep the trust boundary understandable for future contributors

Suggested first changes:

1. keep `open-webui-setup.md` as the step-by-step guide
2. keep `open-webui-sso.md` as the trust and threat-model guide
3. keep the ADR as the source of architectural intent
4. link all three from the roadmap and future deployment docs

## Testing Expectations

### Gateway tests

- trusted-header correlation works only when the trusted mode is enabled
- public-style requests do not gain identity correlation from spoofed headers
- fallback compatibility user behavior is explicit and covered
- usage attribution follows the resolved gateway user

### Deployment validation

- Open WebUI still loads models through the compatibility facade
- model visibility remains aligned with the gateway-resolved user
- proxy stripping does not break the trusted deployment path

## Acceptance Criteria

- Open WebUI remains a client only and never becomes the provider-secret authority
- the provider seam stays untouched by Open WebUI-specific concerns
- public or untrusted callers cannot inject effective gateway identity
- compatibility requests are attributable to the resolved gateway user
- local development remains simple
- production guidance is explicit enough to deploy safely on a VPS

## Suggested Next Implementation Pass

The best next implementation pass is:

1. make the reverse proxy contract concrete in deployment examples
2. add explicit header stripping and reinjection examples for trusted deployments
3. review local versus production runtime profiles in compose and env examples
4. evaluate a stronger identity transport such as proxy-auth or OIDC-backed correlation
