# Open WebUI Gateway Use Case

For a practical step-by-step setup guide, see [open-webui-setup.md](open-webui-setup.md).

## Goal

Run `Open WebUI` locally from Docker Compose and make it use `gateway-api` instead of the default Ollama path.

This is the first protocol-oriented integration use case for the gateway's OpenAI-compatible facade.

## What This Uses

- `Open WebUI` Docker image: `ghcr.io/open-webui/open-webui:main`
- gateway OpenAI-compatible endpoints:
  - `GET /api/v1/openai/models`
  - `POST /api/v1/openai/chat/completions`
- a host-run `gateway-api` on port `3001`

## Required Gateway Runtime Settings

Set these in the `gateway-api` runtime before using Open WebUI:

- `LXP_OPENAI_COMPAT_API_KEY`
- `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL`

Optional, for per-user correlation:

- `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true`
- `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email`
- `LXP_EMAIL_LOOKUP_KEY`

Notes:

- `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL` is the fallback user when no forwarded user email header is available
- `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED` must be `true` before the gateway will accept a forwarded trusted user header
- `LXP_EMAIL_LOOKUP_KEY` must match the key used by `admin-api`, because the gateway resolves the existing `emailHash` lookup value from the forwarded email

## Start the Stack

1. Start `gateway-api` on the host machine so it listens on `http://localhost:3001`.
2. Start the infrastructure and Open WebUI:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis open-webui
```

3. Open `http://localhost:3004`.

If Open WebUI keeps an older provider configuration after env changes, reset its persisted state:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml down
docker volume rm lxp-llm-gateway_open_webui_data
```

## Compose Defaults

The development compose file configures Open WebUI with:

- `ENABLE_OLLAMA_API=false`
- `ENABLE_OPENAI_API=true`
- `BYPASS_MODEL_ACCESS_CONTROL=true`
- `OPENAI_API_BASE_URL=http://host.docker.internal:3001/api/v1/openai`
- `OPENAI_API_KEY=${LXP_OPENAI_COMPAT_API_KEY}`
- `ENABLE_FORWARD_USER_INFO_HEADERS=true`

This makes Open WebUI call the gateway's OpenAI-compatible facade rather than its default Ollama target.
It also prevents Open WebUI from hiding externally-provided models behind its own per-user model access filter, which would otherwise block standard `user` accounts even when the gateway has already resolved their provider access.

## Expected Model IDs

The gateway returns model IDs in this shape:

- `nanogpt/z-ai/glm-4.6:thinking`
- `openrouter/meta-llama/llama-3.3-70b-instruct`
- `google/gemini-2.5-flash`

The provider prefix is intentional.

It lets the OpenAI-compatible facade route the selected model back to the right provider without inventing provider-specific state in Open WebUI.

## User Mapping Behavior

There are two supported modes today.

### Shared User Mode

If only `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL` is configured, every Open WebUI request uses that gateway user.

This is the simplest way to validate the integration end to end.

### Correlated User Mode

If `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email` is configured and Open WebUI forwards user info headers, the gateway resolves the effective user from the forwarded email.

That means provider credentials, default provider/model choices, and auditing behavior can follow the mapped gateway user instead of a single shared service user.

## SSO Status

Open WebUI officially supports OAuth2, OIDC, and trusted-header login, and it can also forward user info headers to OpenAI-compatible backends.

What we support now in the gateway is:

- trusted internal caller authentication through a shared compatibility API key
- optional per-request user correlation from a forwarded email header

What this is not yet:

- a shared session between `Open WebUI` and our own `admin-web`
- a single sign-on implementation where both applications consume the same IdP tokens directly
- a hardened zero-trust deployment model for arbitrary external callers

## Deployment Posture

The current compose-based setup is appropriate for local development and lab validation.

For a deployed environment such as a VPS, the recommended posture is:

1. put `Open WebUI` behind a trusted reverse proxy
2. terminate authentication at the proxy or Open WebUI's native OIDC support
3. only trust forwarded user identity headers from that proxy boundary
4. keep `gateway-api` reachable only from the trusted deployment path
5. use a service-account style compatibility API key, not a user-shared secret
6. keep `BYPASS_MODEL_ACCESS_CONTROL=true` out of production unless the deployment intentionally wants Open WebUI to display every model returned by the gateway

That keeps the current integration usable while preventing a public caller from forging the forwarded identity header.

## Recommended Next Step for True SSO

If we want a stronger shared-identity story later, the cleanest path is:

1. put `Open WebUI` behind an IdP-backed reverse proxy or its native OIDC support
2. configure Open WebUI to trust that identity for login
3. keep `ENABLE_FORWARD_USER_INFO_HEADERS=true`
4. let `gateway-api` map the forwarded email to the existing user table
5. harden network boundaries so only the trusted Open WebUI deployment can reach the compatibility endpoints with the shared key

That would preserve the current gateway/provider seam while making Open WebUI traffic execute with the right per-user provider credentials.
