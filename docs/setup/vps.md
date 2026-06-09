# VPS Deployment

This guide is the recommended starting point for a serious VPS deployment of `lxp-llm-gateway`.

It is intentionally separate from the local quickstart:

- [quickstart.md](./quickstart.md) is for local onboarding
- this document is for a production-like VPS install

The goal is a deployment that stays simple to operate without pretending local quickstart defaults are production-ready.

## Target Topology

The default VPS posture is:

- `admin-web` exposed publicly through a reverse proxy
- `admin-api` bound to localhost and reached through the proxy
- `gateway-api` bound to localhost and kept off the public internet when possible
- `postgres` and `redis` bound to localhost only
- `Open WebUI` optional and documented separately

This keeps the control plane and data plane installable on one VPS while reducing accidental exposure.

## Files To Use

- Core VPS Compose: [infra/compose/docker-compose.vps.yml](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/compose/docker-compose.vps.yml)
- Core VPS env template: [infra/compose/lxp-gateway.vps.env.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/compose/lxp-gateway.vps.env.example)
- Open WebUI setup: [docs/delivery/open-webui-setup.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/delivery/open-webui-setup.md)
- Proxy examples: [infra/proxy/README.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/README.md)

## Prerequisites

- A Linux VPS with Docker and `docker compose`
- A DNS name for the public admin surface, for example `admin.example.com`
- Optionally a second DNS name for the gateway, for example `gateway.example.com`
- A reverse proxy in front of the public surface
- A private env file copied from the template

## 1. Prepare The VPS Env File

The simplest path is to generate the file once with one of the helper scripts.

### Linux / VPS

```bash
LXP_VPS_ADMIN_DOMAIN=admin.example.com \
LXP_VPS_GATEWAY_DOMAIN=gateway.example.com \
LXP_VPS_DEFAULT_USER_EMAIL=ops@example.com \
bash ./scripts/generate-vps-env.sh
```

This creates:

```text
.env.lxp-gateway.vps
```

### PowerShell

```powershell
powershell -ExecutionPolicy Bypass -File ./scripts/Generate-VpsEnv.ps1 `
  -AdminDomain admin.example.com `
  -GatewayDomain gateway.example.com `
  -DefaultUserEmail ops@example.com
```

You can also still start from a manual copy:

```bash
cp infra/compose/lxp-gateway.vps.env.example .env.lxp-gateway.vps
```

Fill in at minimum:

- `LXP_VPS_POSTGRES_PASSWORD`
- `LXP_VPS_ENCRYPTION_MASTER_KEY`
- `LXP_VPS_EMAIL_LOOKUP_KEY`
- `LXP_VPS_COOKIE_SECRET`
- `LXP_VPS_JWT_PRIVATE_KEY`
- `LXP_VPS_ADMIN_WEB_ORIGIN`
- `LXP_VPS_ADMIN_API_PUBLIC_URL`
- `LXP_VPS_GATEWAY_API_PUBLIC_URL`
- `LXP_VPS_OPENAI_COMPAT_API_KEY`
- `LXP_VPS_OPENAI_COMPAT_DEFAULT_USER_EMAIL`

Important rules:

- `LXP_VPS_EMAIL_LOOKUP_KEY` must match between `admin-api` and `gateway-api`
- `LXP_VPS_ENCRYPTION_MASTER_KEY` must stay stable once credentials are stored
- `LXP_VPS_JWT_PRIVATE_KEY` and `LXP_VPS_COOKIE_SECRET` are not development placeholders on a real VPS
- keep `LXP_VPS_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=false` unless you have completed the trusted Open WebUI boundary
- the generated file already keeps shared values aligned, especially `LXP_VPS_EMAIL_LOOKUP_KEY`, `LXP_VPS_ENCRYPTION_MASTER_KEY`, and the OpenAI-compatible key

## 2. Start The Core Stack

From the repository root:

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```

This starts:

- `postgres`
- `redis`
- `admin-api-migrate`
- `gateway-api-migrate`
- `admin-api`
- `gateway-api`
- `admin-web`

The runtime services bind to localhost only:

- `127.0.0.1:3001` for `gateway-api`
- `127.0.0.1:3002` for `admin-api`
- `127.0.0.1:3003` for `admin-web`

That is deliberate. The public entrypoint should be your reverse proxy, not the containers directly.

## 3. Verify Health

On the VPS:

```bash
curl http://127.0.0.1:3002/api/v1/health
curl http://127.0.0.1:3001/api/v1/health
curl http://127.0.0.1:3003
```

If a service does not respond, inspect logs:

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml logs -f
```

## 4. Put A Reverse Proxy In Front

Use the repo examples as templates:

- [infra/proxy/caddy/lxp-gateway.Caddyfile.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/caddy/lxp-gateway.Caddyfile.example)
- [infra/proxy/nginx/lxp-gateway.conf.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/nginx/lxp-gateway.conf.example)
- [infra/proxy/caddy/open-webui.Caddyfile.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/caddy/open-webui.Caddyfile.example)
- [infra/proxy/nginx/open-webui.conf.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/nginx/open-webui.conf.example)
- [infra/proxy/README.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/README.md)

For the core product, the practical rule is:

- proxy `admin.example.com` to `127.0.0.1:3003`
- proxy `admin.example.com/api/v1/*` to `127.0.0.1:3002`
- proxy `gateway.example.com` to `127.0.0.1:3001`
- do not expose container ports directly to the internet

Recommended minimal posture:

- terminate TLS at the reverse proxy
- allow public traffic to the proxy only
- keep Docker-published ports on loopback

### Caddy example

If you use Caddy, start from:

- [infra/proxy/caddy/lxp-gateway.Caddyfile.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/caddy/lxp-gateway.Caddyfile.example)

That example assumes:

- `admin.example.com` serves `admin-web`
- `admin.example.com/api/v1/*` is routed to `admin-api`
- `gateway.example.com` is routed to `gateway-api`

### Nginx example

If you use Nginx, start from:

- [infra/proxy/nginx/lxp-gateway.conf.example](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/proxy/nginx/lxp-gateway.conf.example)

It follows the same two-host pattern as the Caddy example.

## 5. Bootstrap The First Admin

Once the stack and proxy are live, create the first admin:

```bash
curl -X POST https://admin.example.com/api/v1/bootstrap/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "ChangeMe123!",
    "displayName": "First Admin"
  }'
```

After that:

1. sign in to `admin-web`
2. add at least one BYOK provider credential
3. verify model listing and chat through the UI

## 6. Open WebUI Is Optional

Do not make Open WebUI part of the mandatory core install if your primary product is the gateway itself.

Treat it as an optional integration layer:

- VPS Open WebUI guide: [docs/delivery/open-webui-setup.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/delivery/open-webui-setup.md)
- VPS Open WebUI Compose: [infra/compose/docker-compose.open-webui.vps.yml](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/compose/docker-compose.open-webui.vps.yml)
- OAuth2 proxy variant: [infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/infra/compose/docker-compose.open-webui.oauth2-proxy.vps.yml)

Only enable trusted header correlation in `gateway-api` after the Open WebUI trust boundary is actually in place.

## 7. Operational Notes

### Restart

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml restart
```

### Stop

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml down
```

### Update

```bash
git pull
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```

### Logs

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml logs -f
```

## 8. Troubleshooting

### Migrations fail at startup

Inspect the migration jobs first:

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml logs admin-api-migrate gateway-api-migrate
```

Common causes:

- invalid database credentials
- stale Postgres volume
- missing required env values

### Admin UI loads but login or API calls fail

Check:

- `LXP_VPS_ADMIN_WEB_ORIGIN`
- reverse-proxy route mapping
- cookie behavior over HTTPS
- `admin-api` health on `127.0.0.1:3002`

### Gateway calls fail after provider setup

Check:

- BYOK credential was stored correctly
- `LXP_VPS_ENCRYPTION_MASTER_KEY` matches the key used when the credential was written
- outbound provider access from the VPS is allowed

### Open WebUI user correlation does not work

Check:

- `LXP_VPS_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true` only in trusted mode
- trusted header names match the gateway allowlist
- the public proxy strips caller-supplied identity headers first

## 9. Manual Validation Checklist

- Fresh VPS env file created from template
- Core stack starts successfully with `docker-compose.vps.yml`
- Both migration jobs complete successfully
- `admin-api` health returns `200` on loopback
- `gateway-api` health returns `200` on loopback
- `admin-web` responds on loopback
- Reverse proxy exposes the intended public admin surface
- First admin bootstrap succeeds
- Admin login works through HTTPS
- Provider credential can be stored and used
