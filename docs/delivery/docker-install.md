# Docker Compose Install

This guide covers the self-hosted installation path where `lxp-llm-gateway` is started from published container images instead of `pnpm dev`.

Use this guide when:

- you want to install the platform on a server or VPS
- you want Docker Compose to run the runtime apps
- you want the setup wizard to remain the canonical first-install path

This flow still uses the same setup model:

1. prepare a root `.env`
2. start Postgres, Redis, `admin-api`, `gateway-api`, and `admin-web`
3. let the one-shot migration services initialize the schema
4. open `/setup`
5. complete the setup wizard

## 1. Prerequisites

You need:

- Docker Engine
- Docker Compose
- access to the published application images for this repository

If you are using private GitHub Container Registry packages, authenticate first:

```powershell
docker login ghcr.io
```

Use the exact image names and tags published for `lxp-llm-gateway` in your package registry.

## 2. Prepare the Root `.env`

The recommended path is to generate a single root `.env` before starting the stack.

If you have the repository checked out locally:

```powershell
pnpm setup:init
```

If you have published `@lxp/cli-setup` to your chosen npm-compatible registry, you can also use the package directly, for example:

```powershell
pnpm dlx @lxp/cli-setup init
```

Then validate:

```powershell
pnpm setup:doctor
```

Important:

- the setup token is shown once
- only `LXP_SETUP_TOKEN_HASH` is persisted
- keep the generated `.env` outside version control

## 3. Create a Compose File

Create a `docker-compose.yml` beside your `.env`.

Use the published image tags from your registry page in place of the placeholder values below.

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${DATABASE_NAME}
      POSTGRES_USER: ${DATABASE_USER}
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    ports:
      - "6379:6379"

  admin-api:
    image: ghcr.io/lxp-ai-projects/admin-api:latest
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    ports:
      - "3002:3002"

  gateway-api:
    image: ghcr.io/lxp-ai-projects/gateway-api:latest
    restart: unless-stopped
    env_file:
      - .env
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  admin-web:
    image: ghcr.io/lxp-ai-projects/admin-web:latest
    restart: unless-stopped
    depends_on:
      - admin-api
      - gateway-api
    ports:
      - "3003:80"

volumes:
  postgres_data:
```

Notes:

- the same root `.env` is the source of truth for both APIs
- `admin-web` is static and does not need direct database access
- if your deployment uses a reverse proxy, publish only the ports you actually need

## 4. Start the Stack

From the directory containing `.env` and `docker-compose.yml`:

```powershell
docker compose up -d --build
```

Use `--build` on first install and whenever you changed the local Dockerfiles or
workspace packages. Otherwise Docker can reuse stale images and keep serving old
compiled `dist` output.

If you are using the repository-provided setup stack
[docker-compose.setup-dev.yml](../../infra/compose/docker-compose.setup-dev.yml),
the one-shot migration services are already wired in and will run before
`admin-api` and `gateway-api` start.

## 5. Run TypeORM Migrations

The application does not auto-create tables at runtime.

If you are using a plain custom Compose file without one-shot migration services,
run the migration command for both APIs using the images you started:

```powershell
docker compose exec admin-api pnpm migration:run
docker compose exec gateway-api pnpm migration:run
```

Those package scripts point at the compiled `dist/persistence/data-source.js`, so
they work in the production runtime images without `tsx`.

If you are using the repository-provided
[docker-compose.setup-dev.yml](../../infra/compose/docker-compose.setup-dev.yml),
you should not need to run these commands manually.

If you are running the repository locally instead of the container images, the root helper will build first:

```powershell
pnpm db:migration
```

## 6. Open the Setup Wizard

Browse to:

```text
http://localhost:3003/setup
```

Or your deployed `admin-web` URL if you are not on a local workstation.

Use the setup token printed by the CLI.

## 7. Complete Installation

The wizard creates:

- the first super admin
- the first tenant
- the initial tenant membership and tenant policy
- encrypted provider credentials when you choose to save them
- an optional Open WebUI integration client and one-time API key

When setup completes, the setup endpoints close permanently for that installation.

## 8. After Installation

Your normal entry point becomes:

```text
/login
```

If you want `Open WebUI`, continue with:

- [Open WebUI Setup](./open-webui-setup.md)

## Operational Notes

- Keep Postgres data on a persistent volume.
- Keep the root `.env` on durable storage and back it up securely.
- Never expose the setup token in URLs, screenshots, or logs.
- If you rotate the setup token before installation completes, regenerate it through the CLI and restart the stack if your platform does not hot-reload env changes.
