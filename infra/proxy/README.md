# Proxy Contract

This folder contains reverse-proxy examples for two deployment shapes:

- the core `lxp-llm-gateway` product on a VPS
- the optional `Open WebUI -> lxp-llm-gateway` trusted integration

## Core Product Proxy Examples

For the core VPS install, the simplest supported shape is:

- `admin.example.com` -> `admin-web` on `127.0.0.1:3003`
- `admin.example.com/api/v1/*` -> `admin-api` on `127.0.0.1:3002`
- `gateway.example.com` -> `gateway-api` on `127.0.0.1:3001`

Example files:

- [caddy/lxp-gateway.Caddyfile.example](./caddy/lxp-gateway.Caddyfile.example)
- [nginx/lxp-gateway.conf.example](./nginx/lxp-gateway.conf.example)

That split keeps the public entrypoint simple and matches the recommended values in the VPS env template.

## Open WebUI Proxy Contract

These examples document the supported production trust boundary for `Open WebUI -> lxp-llm-gateway`.

The intended posture is:

- expose `Open WebUI` publicly
- keep `gateway-api` on a trusted internal path when possible
- strip caller-supplied identity headers at the public edge
- let trusted `Open WebUI` forward the authenticated user identity to the gateway
- keep provider credentials and BYOK authority inside `gateway-api`

The example files in this folder are:

- [caddy/lxp-gateway.Caddyfile.example](./caddy/lxp-gateway.Caddyfile.example)
- [caddy/open-webui.Caddyfile.example](./caddy/open-webui.Caddyfile.example)
- [caddy/open-webui.forward-auth.Caddyfile.example](./caddy/open-webui.forward-auth.Caddyfile.example)
- [nginx/lxp-gateway.conf.example](./nginx/lxp-gateway.conf.example)
- [nginx/open-webui.conf.example](./nginx/open-webui.conf.example)
- [nginx/open-webui.auth-request.conf.example](./nginx/open-webui.auth-request.conf.example)

Related compose examples live in:

- [../compose/docker-compose.open-webui.vps.yml](../compose/docker-compose.open-webui.vps.yml)
- [../compose/docker-compose.open-webui.oauth2-proxy.vps.yml](../compose/docker-compose.open-webui.oauth2-proxy.vps.yml)

Both examples do the same critical thing:

- remove inbound user-identity headers before the request reaches `Open WebUI`

That prevents a public caller from smuggling `X-OpenWebUI-User-Email` or similar headers into the trusted deployment path.

In the current supported topology, the trusted identity header is injected by the `Open WebUI` deployment itself when:

- `ENABLE_FORWARD_USER_INFO_HEADERS=true`
- the gateway runtime has `LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED=true`
- the OpenAI-compatible facade is reachable only from the trusted deployment path

If you later move identity injection to a reverse proxy or auth gateway, preserve the same rule:

- strip public identity headers first
- inject only trusted identity after authentication

## Proxy-Auth Examples

This repository also includes example configurations for a stronger identity boundary:

- `Caddy + forward_auth`
- `Nginx + auth_request`

These examples assume an auth gateway such as `oauth2-proxy` is already running and can return trusted headers like:

- `X-Auth-Request-User`
- `X-Auth-Request-Email`

When you use that pattern:

1. the public request is authenticated by the auth gateway
2. spoofed identity headers from the public request are removed
3. only the trusted authenticated identity is reintroduced inside the deployment boundary
4. `gateway-api` accepts that identity only when the corresponding trusted header names are allowlisted

If you want a repo-native starting point for that auth gateway, use:

- [../compose/docker-compose.open-webui.oauth2-proxy.vps.yml](../compose/docker-compose.open-webui.oauth2-proxy.vps.yml)
- [../compose/open-webui.oauth2-proxy.vps.env.example](../compose/open-webui.oauth2-proxy.vps.env.example)
