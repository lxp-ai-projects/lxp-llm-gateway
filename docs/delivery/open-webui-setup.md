# Open WebUI Setup

This guide shows how to connect `Open WebUI` to `gateway-api` in two modes:

- local development on your machine
- a VPS-ready deployment with a trusted reverse proxy

The gateway stays the source of truth for user identity and provider access.
For the security model and production trust boundary, see [open-webui-sso.md](../integrations/open-webui-sso.md).

## 1. What You Need

- `gateway-api` running
- `Open WebUI` running in Docker
- a gateway compatibility key set in `gateway-api`
- optionally, forwarded user email correlation for per-user provider access

Required gateway runtime values:

- `LXP_OPENAI_COMPAT_API_KEY`
- `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL`

Optional but recommended for trusted-user mapping:

- `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true`
- `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email`
- `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS=X-OpenWebUI-User-Email,X-Auth-Request-Email`
- `LXP_EMAIL_LOOKUP_KEY`

Repository examples:

- local Open WebUI env: [infra/compose/open-webui.local.env.example](../../infra/compose/open-webui.local.env.example)
- VPS Open WebUI env: [infra/compose/open-webui.vps.env.example](../../infra/compose/open-webui.vps.env.example)
- local gateway profile: [apps/gateway-api/.env.open-webui.local.example](../../apps/gateway-api/.env.open-webui.local.example)
- trusted deployed gateway profile: [apps/gateway-api/.env.open-webui.production.example](../../apps/gateway-api/.env.open-webui.production.example)

## 2. Local Setup

Use this when both apps run on your workstation.

This profile is intentionally permissive:

- `BYPASS_MODEL_ACCESS_CONTROL=true`
- `ENABLE_FORWARD_USER_INFO_HEADERS=true`
- trusted identity correlation is acceptable only because the whole machine is trusted

### Fastest supported local path

From the repository root:

```bash
pnpm setup:quickstart -- --open-webui
```

That path brings up `admin-api`, `gateway-api`, `admin-web`, and `Open WebUI`
with the OpenAI-compatible base URL already wired to:

```text
http://localhost:3001/api/v1/openai
```

The generated quickstart env defaults
`LXP_QUICKSTART_OPENAI_COMPAT_DEFAULT_USER_EMAIL` to `admin@example.com`, so
the simplest first pass is to bootstrap that admin email and store the provider
credential on that same user.

### Alternate dev-compose path

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis open-webui
```

### Open the UI

Browse to:

```text
http://localhost:3004
```

### If the model list is empty

`Open WebUI` can hide gateway-provided models for regular `user` accounts unless its own access-control filter is bypassed.

For this repo's local integration, `BYPASS_MODEL_ACCESS_CONTROL=true` is already set in the compose file. If the list still looks stale:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml down
docker volume rm lxp-llm-gateway_open_webui_data
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis open-webui
```

## 3. VPS-Ready Setup

Use this when `Open WebUI` is exposed to real users.

The recommended posture is:

- keep `gateway-api` on a trusted private boundary
- expose only `Open WebUI` to the public internet
- terminate TLS and login at a reverse proxy or via Open WebUI's native OIDC support
- trust `X-OpenWebUI-User-Email` only from that bounded deployment path
- strip public identity headers before the request reaches `Open WebUI`

### Compose file

Use the VPS compose overlay:

```bash
docker compose --env-file .env.open-webui.vps -f infra/compose/docker-compose.open-webui.vps.yml up -d
```

Create `.env.open-webui.vps` with these values before starting it:

```text
OPENAI_API_BASE_URL=https://gateway.example.com/api/v1/openai
OPENAI_API_KEY=change-me
BYPASS_MODEL_ACCESS_CONTROL=false
```

You can copy the template from [open-webui.vps.env.example](../../infra/compose/open-webui.vps.env.example).

If you want a repo-native `oauth2-proxy` example as well, use:

```bash
docker compose --env-file .env.open-webui.oauth2-proxy.vps -f infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml up -d
```

Template:

- [infra/compose/open-webui.oauth2-proxy.vps.env.example](../../infra/compose/open-webui.oauth2-proxy.vps.env.example)

Typical values on a single VPS:

- `OPENAI_API_BASE_URL=http://host.docker.internal:3001/api/v1/openai`
- `OPENAI_API_KEY=<same key as LXP_OPENAI_COMPAT_API_KEY>`

If `gateway-api` is also containerized, point `OPENAI_API_BASE_URL` at the internal gateway address instead of the host URL.

### Reverse proxy

Expose `Open WebUI` through a reverse proxy and keep the container bound to localhost only.

This repository now includes ready-to-copy examples:

- [infra/proxy/README.md](../../infra/proxy/README.md)
- [infra/proxy/caddy/open-webui.Caddyfile.example](../../infra/proxy/caddy/open-webui.Caddyfile.example)
- [infra/proxy/nginx/open-webui.conf.example](../../infra/proxy/nginx/open-webui.conf.example)

Minimal Caddy example:

```caddy
openwebui.example.com {
  header {
    -X-OpenWebUI-User-Email
    -X-Forwarded-User
    -X-Forwarded-Email
    -X-Auth-Request-User
    -X-Auth-Request-Email
  }

  reverse_proxy 127.0.0.1:3004
}
```

Minimal Nginx example:

```nginx
server {
  listen 443 ssl http2;
  server_name openwebui.example.com;

  location / {
    proxy_pass http://127.0.0.1:3004;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-OpenWebUI-User-Email "";
    proxy_set_header X-Forwarded-User "";
    proxy_set_header X-Forwarded-Email "";
    proxy_set_header X-Auth-Request-User "";
    proxy_set_header X-Auth-Request-Email "";
  }
}
```

### Reverse proxy contract

For a deployed environment, treat this as mandatory:

1. public traffic reaches only the reverse proxy
2. the reverse proxy strips user identity headers supplied by the caller
3. `Open WebUI` stays bound to `127.0.0.1` or an internal network
4. `gateway-api` is reachable only from the trusted deployment path when possible
5. trusted identity correlation is enabled in the gateway only when that boundary is in place

In the current supported topology, identity injection is done by the trusted `Open WebUI` deployment itself through `ENABLE_FORWARD_USER_INFO_HEADERS=true`.
The public proxy does not invent the user identity. Its job is to prevent the public caller from injecting one.

If you want a stronger deployed identity boundary, this repository also includes proxy-auth examples:

- [infra/proxy/nginx/open-webui.auth-request.conf.example](../../infra/proxy/nginx/open-webui.auth-request.conf.example)
- [infra/proxy/caddy/open-webui.forward-auth.Caddyfile.example](../../infra/proxy/caddy/open-webui.forward-auth.Caddyfile.example)

Those examples assume an auth gateway such as `oauth2-proxy` and re-inject trusted identity only after authentication.
This repository also includes a matching compose example for `oauth2-proxy`:

- [infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml](../../infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml)

### Security notes

- keep the OpenAI compatibility key private
- do not expose `gateway-api` directly to the public internet unless you really mean to
- keep the trusted email header only inside the proxy boundary
- keep `BYPASS_MODEL_ACCESS_CONTROL=false` by default in deployed environments
- use `BYPASS_MODEL_ACCESS_CONTROL=true` only for a trusted deployment where `Open WebUI` is intentionally allowed to display the gateway's returned model list

## 4. How Identity Works

There are two modes.

### Shared service user

If only `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL` is set, all Open WebUI requests use that gateway user.

This is the simplest mode for testing.

This is also the safest compatibility fallback when you have not yet completed the trusted-header production boundary.

### Per-user correlation

If `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email` is set and Open WebUI forwards user info headers, the gateway resolves the real user from the forwarded email.

That lets provider credentials follow the actual gateway user instead of a shared service account.

This correlation is only enabled when `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true`.

For proxy-auth or OIDC-backed deployments, prefer `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS` so the gateway can accept only the specific trusted header names you allow, such as:

- `X-OpenWebUI-User-Email`
- `X-Auth-Request-Email`
- `X-Forwarded-Email`

If more than one trusted header is present with different email values, the gateway rejects the request instead of guessing which identity to trust.

For the proxy-auth examples in this repository, a practical production setting is:

```text
LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS=X-Auth-Request-Email,X-OpenWebUI-User-Email
```

If you use the `oauth2-proxy` compose example, `X-Auth-Request-Email` is the main header to keep allowlisted in the gateway.

For a VPS deployment, only turn this on once the public proxy is stripping inbound identity headers and the Open WebUI deployment is on a trusted internal path.

## 6. Runtime Profiles

Use the profiles in this repository as a guardrail:

- local Open WebUI: [infra/compose/open-webui.local.env.example](../../infra/compose/open-webui.local.env.example)
- deployed Open WebUI: [infra/compose/open-webui.vps.env.example](../../infra/compose/open-webui.vps.env.example)
- local gateway profile: [apps/gateway-api/.env.open-webui.local.example](../../apps/gateway-api/.env.open-webui.local.example)
- deployed gateway profile: [apps/gateway-api/.env.open-webui.production.example](../../apps/gateway-api/.env.open-webui.production.example)

The key behavioral differences are:

1. local mode is allowed to be more permissive to make testing simple
2. deployed mode keeps model filtering stricter by default
3. trusted user correlation in deployed mode is valid only with the reverse-proxy contract already in place

## 7. Stronger Production Identity

If you need a stronger deployed posture than a plain trusted email header, use this progression:

1. keep the public proxy in front of `Open WebUI`
2. authenticate the user at the proxy or through Open WebUI OIDC
3. keep `gateway-api` on the trusted internal path
4. forward user identity only from that authenticated trusted path
5. keep provider resolution and usage attribution inside `gateway-api`

The architectural target for that path is documented in [ADR-008-open-webui-identity-strengthening.md](../architecture/decisions/ADR-008-open-webui-identity-strengthening.md).

## 8. Google OIDC via oauth2-proxy

This is the simplest first production-grade OIDC procedure for this repository.

The shape is:

1. the user signs in with Google
2. `oauth2-proxy` receives the authenticated identity
3. the public proxy strips public identity headers and re-injects trusted auth headers
4. `Open WebUI` stays the public UI
5. `gateway-api` resolves the real internal user from the trusted email header

### Step 1: Create the Google OAuth client

In `Google Cloud Console`:

1. open your project
2. go to `APIs & Services > Credentials`
3. create an `OAuth 2.0 Client ID`
4. choose `Web application`

Use values like:

- `Authorized JavaScript origins`: `https://openwebui.example.com`
- `Authorized redirect URI`: `https://openwebui.example.com/oauth2/callback`

Google will return:

- `client_id`
- `client_secret`

### Step 2: Prepare the oauth2-proxy env file

Copy:

- [infra/compose/open-webui.oauth2-proxy.vps.env.example](../../infra/compose/open-webui.oauth2-proxy.vps.env.example)

Then set:

```text
OPENAI_API_BASE_URL=https://gateway.example.com/api/v1/openai
OPENAI_API_KEY=<same value as LXP_OPENAI_COMPAT_API_KEY>
BYPASS_MODEL_ACCESS_CONTROL=false

OAUTH2_PROXY_PROVIDER=google
OAUTH2_PROXY_CLIENT_ID=<google-client-id>
OAUTH2_PROXY_CLIENT_SECRET=<google-client-secret>
OAUTH2_PROXY_COOKIE_SECRET=<32-byte-base64-secret>
OAUTH2_PROXY_REDIRECT_URL=https://openwebui.example.com/oauth2/callback
```

Notes:

- when `OAUTH2_PROXY_PROVIDER=google`, `OAUTH2_PROXY_OIDC_ISSUER_URL` is not needed
- `OAUTH2_PROXY_COOKIE_SECRET` must be a strong secret sized for `oauth2-proxy`

### Step 3: Prepare the gateway production profile

Use:

- [apps/gateway-api/.env.open-webui.production.example](../../apps/gateway-api/.env.open-webui.production.example)

At minimum, set:

```text
LXP_OPENAI_COMPAT_API_KEY=<same value as OPENAI_API_KEY>
LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL=patrick@example.com
LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true
LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS=X-Auth-Request-Email,X-OpenWebUI-User-Email
LXP_EMAIL_LOOKUP_KEY=<same key used by admin-api>
```

Important:

- `X-Auth-Request-Email` is the key header for the `oauth2-proxy` flow
- `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL` remains a fallback only
- Google account emails must correspond to existing users in the gateway database

### Step 4: Start Open WebUI and oauth2-proxy

Use:

```bash
docker compose --env-file .env.open-webui.oauth2-proxy.vps -f infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml up -d
```

This starts:

- `open-webui` on `127.0.0.1:3004`
- `oauth2-proxy` on `127.0.0.1:4180`

### Step 5: Put the public proxy in front

Use one of these repo examples:

- [infra/proxy/nginx/open-webui.auth-request.conf.example](../../infra/proxy/nginx/open-webui.auth-request.conf.example)
- [infra/proxy/caddy/open-webui.forward-auth.Caddyfile.example](../../infra/proxy/caddy/open-webui.forward-auth.Caddyfile.example)

The important rule is:

1. strip caller-supplied identity headers first
2. authenticate the user through `oauth2-proxy`
3. re-inject only trusted headers such as `X-Auth-Request-Email`

### Step 6: Validate the email mapping

Before testing the UI, confirm the Google account email exists as a user in the gateway database.

If the Google email is not present as an active gateway user, model listing and chat will fail because the gateway cannot resolve `emailHash`.

### Step 7: Test the full flow

1. browse to `https://openwebui.example.com`
2. sign in with Google
3. confirm Open WebUI loads
4. confirm the model list appears
5. submit a chat request
6. inspect `gateway-api` logs for:
   - `gateway.compatibility.identity.resolved`
   - `identitySource=openai-compatible-trusted-header`
   - `trustedHeaderName=X-Auth-Request-Email`

### Step 8: Common Google OIDC pitfalls

- redirect URI mismatch in Google Cloud Console
- wrong `OPENAI_API_KEY` compared with `LXP_OPENAI_COMPAT_API_KEY`
- `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED` left at `false`
- missing `X-Auth-Request-Email` in `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS`
- Google email does not exist as an active user in the gateway database
- `LXP_EMAIL_LOOKUP_KEY` does not match the key used by `admin-api`

## 9. Troubleshooting

- If models do not appear, check the gateway logs first.
- If models appear for one user but not another, confirm the Open WebUI account role and the gateway user's provider credentials.
- If the model list looks stale, restart Open WebUI and clear its volume.
- If the header-based user mapping does not work, confirm `LXP_EMAIL_LOOKUP_KEY` matches `admin-api`.
