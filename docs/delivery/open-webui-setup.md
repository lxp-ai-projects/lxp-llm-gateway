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
- `LXP_EMAIL_LOOKUP_KEY`

## 2. Local Setup

Use this when both apps run on your workstation.

### Start the stack

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

```powershell
docker compose --env-file .env.open-webui.vps -f infra/compose/docker-compose.open-webui.vps.yml up -d
```

Create `.env.open-webui.vps` with these values before starting it:

```text
OPENAI_API_BASE_URL=https://gateway.example.com/api/v1/openai
OPENAI_API_KEY=change-me
```

You can copy the template from [open-webui.vps.env.example](../../infra/compose/open-webui.vps.env.example).

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

### Security notes

- keep the OpenAI compatibility key private
- do not expose `gateway-api` directly to the public internet unless you really mean to
- keep the trusted email header only inside the proxy boundary
- use `BYPASS_MODEL_ACCESS_CONTROL=true` only for a trusted deployment where `Open WebUI` is intentionally allowed to display the gateway's returned model list

## 4. How Identity Works

There are two modes.

### Shared service user

If only `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL` is set, all Open WebUI requests use that gateway user.

This is the simplest mode for testing.

### Per-user correlation

If `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER=X-OpenWebUI-User-Email` is set and Open WebUI forwards user info headers, the gateway resolves the real user from the forwarded email.

That lets provider credentials follow the actual gateway user instead of a shared service account.

This correlation is only enabled when `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true`.

For a VPS deployment, only turn this on once the public proxy is stripping inbound identity headers and the Open WebUI deployment is on a trusted internal path.

## 5. Troubleshooting

- If models do not appear, check the gateway logs first.
- If models appear for one user but not another, confirm the Open WebUI account role and the gateway user's provider credentials.
- If the model list looks stale, restart Open WebUI and clear its volume.
- If the header-based user mapping does not work, confirm `LXP_EMAIL_LOOKUP_KEY` matches `admin-api`.
