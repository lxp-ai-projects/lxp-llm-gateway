# Local Quickstart

This quickstart is the fastest supported way to run `lxp-llm-gateway` locally
without learning the full monorepo first.

It is intentionally additive:

- it does not replace `pnpm dev`
- it does not introduce a separate setup framework
- it keeps Docker Compose as the real runtime entrypoint

## Prerequisites

- Docker Desktop or Docker Engine with `docker compose`
- No local process already bound to ports `3001`, `3002`, `3003`, `5432`, or
  `6379`
- Port `3004` also needs to be free if you enable the optional Open WebUI
  profile

`Node.js` and `pnpm` are only required if you want to use the convenience
script.

## Fastest Path

From the repository root:

```bash
pnpm setup:quickstart
```

Optional Open WebUI profile:

```bash
pnpm setup:quickstart -- --open-webui
```

What this does:

- checks that Docker is available
- creates `infra/compose/.env.quickstart` if it does not exist yet
- generates local-only secrets for the quickstart env file
- starts Postgres, Redis, both migration jobs, `admin-api`, `gateway-api`, and
  `admin-web`
- sequences the gateway migration after the admin migration so the shared
  database bootstraps predictably

To stop the stack:

```bash
pnpm setup:quickstart:down
```

To follow logs:

```bash
pnpm setup:quickstart:logs
```

## Compose-Only Path

If you prefer not to use the helper script:

1. Copy
   [infra/compose/quickstart.env.example](../../infra/compose/quickstart.env.example)
   to `infra/compose/.env.quickstart`
2. Fill in the required secret values
3. Start the stack:

```bash
docker compose --env-file infra/compose/.env.quickstart -f infra/compose/docker-compose.quickstart.yml up -d --build
```

Optional Open WebUI profile:

```bash
docker compose --env-file infra/compose/.env.quickstart -f infra/compose/docker-compose.quickstart.yml --profile open-webui up -d --build
```

## URLs

- Admin UI: `http://localhost:3003`
- Admin API health: `http://localhost:3002/api/v1/health`
- Gateway API health: `http://localhost:3001/api/v1/health`
- Open WebUI: `http://localhost:3004` when the `open-webui` profile is enabled

The OpenAI-compatible base URL in this quickstart is:

```text
http://localhost:3001/api/v1/openai
```

## Validation

Run these after `pnpm setup:quickstart`:

```bash
curl http://localhost:3002/api/v1/health
curl http://localhost:3001/api/v1/health
curl http://localhost:3003
```

If Open WebUI is enabled, confirm:

```text
http://localhost:3004
```

## Next Steps

### 1. Bootstrap the first admin

Call the bootstrap endpoint once:

```bash
curl -X POST http://localhost:3002/api/v1/bootstrap/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "ChangeMe123!",
    "displayName": "First Admin"
  }'
```

This quickstart generates
`LXP_QUICKSTART_OPENAI_COMPAT_DEFAULT_USER_EMAIL=admin@example.com` by default.
If you bootstrap a different user, update `infra/compose/.env.quickstart`
before testing the OpenAI-compatible facade or Open WebUI.

### 2. Sign in to the Admin UI

Open `http://localhost:3003` and sign in with the admin you just created.

### 3. Add a provider credential

Use the existing BYOK workflow in the Admin UI to add at least one provider
credential for that user.

### 4. Verify the OpenAI-compatible model list

```bash
curl http://localhost:3001/api/v1/openai/models \
  -H "Authorization: Bearer <LXP_QUICKSTART_OPENAI_COMPAT_API_KEY>"
```

### 5. Test the gateway

- use the local chat surface in `admin-web`, or
- call `gateway-api` directly, or
- enable the optional Open WebUI profile

## Troubleshooting

### Missing Docker

If `pnpm setup:quickstart` says Docker is unavailable:

- make sure Docker Desktop is started
- verify `docker --version`
- verify `docker compose version`

### Ports already in use

The helper script stops early if required ports are already occupied.

Free these ports before retrying:

- `3001`
- `3002`
- `3003`
- `5432`
- `6379`
- `3004` when Open WebUI is enabled

### Existing database state

The quickstart uses a persistent Docker volume. If you want a clean slate:

```bash
pnpm setup:quickstart:down
docker volume rm lxp-llm-gateway-quickstart_postgres_quickstart_data
```

If the optional Open WebUI profile was enabled and you also want to reset it:

```bash
docker volume rm lxp-llm-gateway-quickstart_open_webui_quickstart_data
```

### Migration failures

Check the migration job logs:

```bash
docker compose --env-file infra/compose/.env.quickstart -f infra/compose/docker-compose.quickstart.yml logs admin-api-migrate gateway-api-migrate
```

Typical causes:

- a corrupted or old Postgres volume
- invalid values in `infra/compose/.env.quickstart`
- Docker build cache holding stale dependencies

### Empty model list

Check these first:

- `LXP_QUICKSTART_OPENAI_COMPAT_DEFAULT_USER_EMAIL` matches a real gateway user
- that user has at least one working provider credential
- the provider credential has a valid API token and, if needed, base URL
- tenant model-access rules are not hiding the provider models

### Provider credential missing

If Open WebUI reaches the gateway but chat fails immediately, sign in to
`http://localhost:3003` and add a BYOK credential for the user resolved by the
OpenAI-compatible facade.

For the default quickstart path, that user is `admin@example.com`.

### Gateway cannot reach the provider

If the provider credential exists but chat still fails:

- verify the provider API key
- verify the selected model ID
- verify any provider-specific base URL override
- verify outbound network access from Docker to the provider

### Admin UI loads but APIs are unreachable

Check the health endpoints directly:

- `http://localhost:3002/api/v1/health`
- `http://localhost:3001/api/v1/health`

Then inspect service logs:

```bash
pnpm setup:quickstart:logs
```

## Manual Validation Checklist

- Fresh checkout with no pre-existing quickstart env file
- `pnpm setup:quickstart` creates `infra/compose/.env.quickstart`
- Postgres and Redis start successfully
- Both migration jobs complete successfully
- `admin-api` health returns `200`
- `gateway-api` health returns `200`
- `admin-web` is reachable on `http://localhost:3003`
- First admin bootstrap succeeds
- OpenAI-compatible model listing works after a provider credential is added
- Open WebUI reaches the gateway when the optional profile is enabled
- Existing developer flow with `docker-compose.dev.yml` and `pnpm dev` remains
  unchanged
