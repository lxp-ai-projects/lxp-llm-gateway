# lxp-llm-gateway

Multi-provider LLM gateway monorepo.

![Backend Build](https://img.shields.io/badge/backend_build-GitHub%20Actions%20configured-0b7285?logo=githubactions)
![Frontend Build](https://img.shields.io/badge/frontend_build-GitHub%20Actions%20configured-0b7285?logo=githubactions)
![admin-api](https://img.shields.io/badge/admin--api-NestJS%20control%20plane-1B72E8?logo=nestjs)
![gateway-api](https://img.shields.io/badge/gateway--api-NestJS%20data%20plane-1B72E8?logo=nestjs)
![admin-web](https://img.shields.io/badge/admin--web-React%2019%20%2B%20Mantine-0F766E?logo=react)
![admin-web coverage](https://img.shields.io/badge/admin--web%20coverage-90.06%25-brightgreen)

Workflow files:

- [Backend Build](.github/workflows/backend-build.yml)
- [Frontend Build](.github/workflows/frontend-build.yml)

## Current State

This repository currently contains:

- foundational documentation
- a minimal monorepo workspace
- NestJS API applications
- a React 19 + Vite admin application
- provider seam packages
- working provider packages for NanoGPT, OpenRouter, and Ollama

The repository now includes:

- JWT auth with refresh rotation and Redis-backed revocation
- encrypted provider credential storage in Postgres
- gateway authentication via access token `emailHash`
- non-stream JSON chat responses with structured assistant output
- streaming support across NanoGPT, OpenRouter, and Ollama
- one planned role-aware SPA for both admin and user control-plane workflows

## Structure

- `apps/gateway-api`: data-plane gateway
- `apps/admin-api`: control-plane API
- `apps/admin-web`: admin interface
- `packages/contracts`: transport contracts
- `packages/domain`: framework-agnostic domain types
- `packages/provider-sdk`: provider adapter seam
- `packages/provider-nanogpt`: NanoGPT implementation
- `packages/provider-openrouter`: OpenRouter implementation
- `packages/provider-ollama`: Ollama implementation

## Selected Stack

- APIs: NestJS
- Frontend: React 19, Vite, React Router DOM, TanStack Query
- UI Foundation: Mantine with custom theme
- Workspace: pnpm, turbo, TypeScript

## Local Secrets

Generate local secrets for `apps/admin-api/.env` and `apps/gateway-api/.env`.

### Bash

Generate a base64 32-byte key:

```bash
openssl rand -base64 32
```

Generate a strong cookie or JWT secret:

```bash
openssl rand -hex 32
```

Suggested usage:

- `LXP_ENCRYPTION_MASTER_KEY`: `openssl rand -base64 32`
- `LXP_EMAIL_LOOKUP_KEY`: `openssl rand -base64 32`
- `LXP_COOKIE_SECRET`: `openssl rand -hex 32`
- `LXP_JWT_PRIVATE_KEY`: use a generated private key or a strong secret for local development

Generate an RSA private key for local JWT signing:

```bash
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out jwt-private.pem
```

### Windows PowerShell

Generate a base64 32-byte key:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

Generate a strong cookie or JWT secret:

```powershell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

Suggested usage:

- `LXP_ENCRYPTION_MASTER_KEY`: base64 32-byte key
- `LXP_EMAIL_LOOKUP_KEY`: base64 32-byte key
- `LXP_COOKIE_SECRET`: hex or equivalent strong random secret
- `LXP_JWT_PRIVATE_KEY`: use a generated private key or a strong secret for local development

Generate an RSA private key for local JWT signing:

```powershell
ssh-keygen -t rsa -b 2048 -m PEM -f jwt-private.pem -N '""'
```

Do not commit generated secret values.

## Local Run

### 1. Start local infrastructure

From the repository root:

```bash
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

Windows PowerShell:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d
```

### 2. Run database migrations

From the repository root:

```bash
pnpm --filter @lxp/admin-api migration:run
```

Windows PowerShell:

```powershell
pnpm.cmd --filter @lxp/admin-api migration:run
```

This project does not auto-create tables at application startup.

The database schema is initialized through TypeORM migrations, so the migration step is required before using `admin-api` or `gateway-api` against a fresh database.

### 3. Start the applications

Start `admin-api`:

```bash
pnpm --filter @lxp/admin-api dev
```

```powershell
pnpm.cmd --filter @lxp/admin-api dev
```

Start `gateway-api`:

```bash
pnpm --filter @lxp/gateway-api dev
```

```powershell
pnpm.cmd --filter @lxp/gateway-api dev
```

Start `admin-web`:

```bash
pnpm --filter @lxp/admin-web dev
```

```powershell
pnpm.cmd --filter @lxp/admin-web dev
```

### 4. Manual endpoint testing

Use the HTTP files in [queries/README.md](queries/README.md):

1. if the database is empty, run `Bootstrap First Admin` from `queries/admin-api.http`
2. run `queries/auth.http` to obtain tokens
3. use `queries/admin-api.http` for protected admin operations
4. use `queries/provider-credentials.http` to resolve `userUuid` and store provider credentials for NanoGPT, OpenRouter, or Ollama
5. use `queries/gateway-api.http` for:
   - non-stream JSON chat
   - stream SSE chat with supported providers and thinking-capable models

See the gateway response contract in [docs/api/gateway-contract.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/api/gateway-contract.md).

UI planning and backend-aligned UI architecture are documented in:

- [docs/architecture/ui-architecture.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/architecture/ui-architecture.md)
- [docs/delivery/ui-implementation-plan.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/delivery/ui-implementation-plan.md)
- [docs/architecture/decisions/ADR-006-web-session-and-runtime-config.md](/C:/Data/Workspace/TypeScript/lxp-llm-gateway/docs/architecture/decisions/ADR-006-web-session-and-runtime-config.md)

### 5. Workspace validation

From the repository root:

```bash
pnpm build
pnpm lint
pnpm test
```

Windows PowerShell:

```powershell
pnpm.cmd build
pnpm.cmd lint
pnpm.cmd test
```

## Next Steps

- add route guards to more control-plane surfaces as they appear
- refine OpenAPI so it reflects the implemented gateway contract
- decide how much provider-native stream data should be normalized vs passed through
