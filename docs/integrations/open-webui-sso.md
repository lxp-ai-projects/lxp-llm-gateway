# Open WebUI Trusted Integration

This document defines the supported Open WebUI topology for `lxp-llm-gateway`.

For the ordered delivery plan, see [open-webui-hardening-plan.md](../delivery/open-webui-hardening-plan.md).

## Supported Topology

Open WebUI is a client UI only.

- Open WebUI renders the chat experience
- `lxp-llm-gateway` remains the security authority and BYOK authority
- provider credentials are resolved by the gateway, not by Open WebUI
- Open WebUI should not be treated as the source of truth for model access, provider access, or usage attribution

The supported transport shape is the OpenAI-compatible facade exposed by `gateway-api`.

## Trusted Identity Flow

There are two supported identity modes.

### Local Development Mode

This mode is for developer machines and lab environments.

- Open WebUI authenticates to the compatibility facade with a shared API key
- the gateway may accept `X-OpenWebUI-User-Email`
- the gateway resolves the real user from the forwarded email
- the gateway still chooses the provider credential and default model
- Open WebUI model filtering may be bypassed intentionally for local operability

This is acceptable only when the deployment boundary is trusted.

### Production Trusted Mode

This mode is for a VPS or other deployed environment.

- Open WebUI remains an internal client
- `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true` is set in the gateway runtime
- a reverse proxy or trusted ingress boundary strips untrusted identity headers
- the proxy injects the trusted user identity header only after authentication
- `gateway-api` accepts the trusted header only from that bounded trust zone
- public or untrusted requests must not be able to set or preserve trusted identity headers
- Open WebUI model filtering should remain enabled by default unless the deployment explicitly chooses otherwise

If a request does not come from the trusted boundary, the gateway must ignore any caller-supplied identity header.

In the current implementation, compatibility requests are also audited against the resolved gateway user:

- compatibility auth records whether identity came from the trusted header or the fallback compatibility user
- gateway request audit records `resolvedUserUuid`, `identitySource`, `providerId`, and `model`
- logs use user fingerprints instead of provider secrets or raw BYOK material

## Threat Model

The main risks are:

- spoofed headers
- shared backend key misuse
- user/model access mismatch
- provider credential leakage
- public exposure of internal compatibility endpoints

### Spoofed Headers

Risk:

- an external caller forges `X-OpenWebUI-User-Email` or a similar header

Mitigation:

- strip identity headers at the public proxy boundary
- inject identity headers only from trusted infrastructure
- treat the forwarded header as trusted only when the deployment path is controlled

### Shared Backend Key Misuse

Risk:

- the compatibility API key leaks or is reused as a human credential

Mitigation:

- treat the compatibility key as a service-account secret
- rotate it like any other infrastructure secret
- keep it out of browser-visible or user-managed settings

### User/Model Access Mismatch

Risk:

- Open WebUI filters models differently from the gateway and hides valid gateway choices

Mitigation:

- keep the gateway as the authority for user/provider access
- use Open WebUI only as a transport client
- in trusted deployments, configure Open WebUI so it does not override the gateway's returned model list

### Provider Credential Leakage

Risk:

- provider secrets leak into Open WebUI or public logs

Mitigation:

- keep provider credentials only in `admin-api` and `gateway-api`
- do not mirror BYOK secrets into Open WebUI configuration
- ensure logs redact tokens and secrets

### Public Exposure of Internal Endpoints

Risk:

- the OpenAI-compatible facade becomes an externally reachable public API

Mitigation:

- keep `gateway-api` internal when possible
- expose Open WebUI publicly, not the compatibility facade
- require the compatibility API key even inside the trusted boundary

## Production Hardening

For a deployed VPS:

1. place Open WebUI behind a reverse proxy
2. terminate TLS at the proxy
3. strip all incoming identity headers at the public edge
4. inject trusted identity headers only from the proxy or trusted Open WebUI deployment
5. keep Open WebUI to gateway traffic on an internal network when possible
6. use the gateway to attribute usage to the resolved gateway user
7. keep `BYPASS_MODEL_ACCESS_CONTROL=true` out of the public path unless the deployment intentionally wants Open WebUI to show every model returned by the gateway

## Reverse Proxy Contract

For the currently supported production topology:

- the public proxy sits in front of `Open WebUI`
- `Open WebUI` talks to `gateway-api` as a trusted internal client
- the public proxy strips identity headers from the inbound request before it reaches `Open WebUI`
- the trusted `Open WebUI` deployment may then forward the authenticated user identity to `gateway-api`

This means the trust chain is:

1. the public caller authenticates to the public entrypoint
2. the public entrypoint removes any caller-supplied identity headers
3. `Open WebUI` establishes the application user context
4. `Open WebUI` forwards the trusted user identity to `gateway-api`
5. `gateway-api` accepts that forwarded identity only when trusted identity mode is enabled

Repository examples for this boundary live in:

- [infra/proxy/README.md](../../infra/proxy/README.md)
- [infra/proxy/caddy/open-webui.Caddyfile.example](../../infra/proxy/caddy/open-webui.Caddyfile.example)
- [infra/proxy/nginx/open-webui.conf.example](../../infra/proxy/nginx/open-webui.conf.example)

## Action Items

These are the concrete next steps to improve the current posture.

### Application

- add an explicit trusted-internal runtime mode for the compatibility facade
- ignore or reject forwarded identity headers outside the trusted integration path
- ensure audit and usage attribution always record the resolved gateway user
- keep the compatibility API key scoped to service-to-service use only

### Infrastructure

- strip user identity headers at the public proxy boundary
- inject trusted identity headers only after authentication at the reverse proxy or trusted Open WebUI boundary
- keep `Open WebUI -> gateway-api` traffic private when possible
- rotate the compatibility API key as an infrastructure secret

### Operational Guidance

- keep local dev mode and production mode documented separately
- use local trusted-header correlation only in controlled lab environments
- require a stronger identity boundary such as OIDC or proxy-auth before relying on user correlation in production

## Runtime Profile Guidance

The repository now ships separate example profiles for:

- local Open WebUI integration
- deployed Open WebUI integration
- local gateway Open WebUI compatibility mode
- deployed gateway Open WebUI compatibility mode

Operators should treat those examples as policy, not just convenience:

- local mode may use permissive settings to preserve developer velocity
- deployed mode should default to the stricter posture and opt into permissive behavior explicitly

## Security Boundary

The provider seam stays clean.

- Open WebUI does not talk to provider adapters
- Open WebUI does not know provider credentials
- Open WebUI does not resolve BYOK secrets
- Open WebUI only talks to the OpenAI-compatible facade

The compatibility facade is a gateway concern, not a provider concern.
