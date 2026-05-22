# lxp-llm-gateway

Multi-provider LLM gateway monorepo and BYOK (bring your own key) platform foundation.

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
- a production-shaped monorepo workspace
- NestJS API applications
- a React 19 + Vite admin application
- provider seam packages
- working provider packages for Anthropic Claude, Google Gemini, Groq, NanoGPT, Ollama, OpenAI, OpenRouter, and xAI Grok

The repository now includes:

- JWT auth with refresh rotation and Redis-backed revocation
- encrypted provider credential storage in Postgres
- BYOK provider access through user-managed provider credentials
- gateway authentication via access token `emailHash`
- gateway model discovery through provider adapters
- non-stream JSON chat responses with structured assistant output
- streaming support across Anthropic Claude, Google Gemini, Groq, NanoGPT, Ollama, OpenAI, OpenRouter, and xAI Grok
- streaming SSE passthrough for NanoGPT thinking models
- one role-aware SPA for both admin and user control-plane workflows
- frontend feature modules under `src/features/*`
- CI workflows enforcing typecheck, test, and build

## Structure

- `apps/gateway-api`: data-plane gateway
- `apps/admin-api`: control-plane API
- `apps/admin-web`: admin interface
- `packages/contracts`: transport contracts
- `packages/domain`: framework-agnostic domain types
- `packages/provider-sdk`: provider adapter seam
- `packages/provider-anthropic`: Anthropic Claude implementation
- `packages/provider-google`: Google Gemini implementation
- `packages/provider-groq`: Groq implementation
- `packages/provider-nanogpt`: NanoGPT implementation
- `packages/provider-ollama`: Ollama implementation
- `packages/provider-openai`: OpenAI implementation
- `packages/provider-openrouter`: OpenRouter implementation
- `packages/provider-xai`: xAI Grok implementation

## Provider Support

| Status              | Meaning                                                                                                                                      | Current providers                                                                                              |
|---------------------|----------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------|
| `Tested (QA)`       | Tested by the development team and currently confirmed to work in `lxp-llm-gateway`.                                                         | Anthropic Claude, Deepseek, Google Gemini, Groq, Moonshot, NanoGPT, Ollama, OpenAI, OpenRouter, xAI Grok, z.AI |
| `Not yet QA'd`      | Implemented, but not yet formally exercised by the development team. It may still work, but treat it as potentially unstable until verified. |                                                                                                                |

Image-model compatibility by provider is documented in:

- [docs/product/image-provider-compatibility-matrix.md](docs/product/image-provider-compatibility-matrix.md)

## Selected Stack

- Runtime: Node.js 24
- APIs: NestJS
- Frontend: React 19, Vite, React Router DOM, TanStack Query
- UI Foundation: Mantine with custom theme
- Workspace: pnpm, turbo, TypeScript

## First-Time Setup

The recommended install path is now:

1. generate the root `.env` with `pnpm setup:init`
2. run TypeORM migrations
3. start the apps with `pnpm dev`
4. open the setup wizard at `/setup`

The CLI prepares technical secrets and runtime URLs.
The setup wizard creates application data such as the first super admin, first tenant, provider credentials, and optional Open WebUI integration bootstrap.

Full guide:

- [docs/delivery/first-install.md](docs/delivery/first-install.md)
- [docs/delivery/docker-install.md](docs/delivery/docker-install.md)

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

### 2. Generate and validate the root `.env`

From the repository root:

```bash
pnpm setup:init
```

```powershell
pnpm.cmd setup:init
```

Validate the generated file:

```bash
pnpm setup:doctor
```

```powershell
pnpm.cmd setup:doctor
```

The CLI prints the setup URL and raw setup token once.
Only `LXP_SETUP_TOKEN_HASH` is persisted to the root `.env`.

### 3. Run database migrations

From the repository root:

```bash
pnpm db:migration:admin
pnpm db:migration:gateway
```

Windows PowerShell:

```powershell
pnpm.cmd db:migration:admin
pnpm.cmd db:migration:gateway
```

This project does not auto-create tables at application startup.

The database schema is initialized through TypeORM migrations, so the migration step is required before using `admin-api` or `gateway-api` against a fresh database.

### 4. Start the runtime apps

Recommended monorepo startup from the repository root:

```bash
pnpm dev
```

```powershell
pnpm.cmd dev
```

This startup path:

- checks that ports `3001`, `3002`, and `3003` are available
- builds the shared dependencies required by the runtime apps
- starts only the three runtime apps
- uses Turbo filters instead of `turbo run dev --parallel`
- uses `--concurrency=4` because Turbo 2.9.x requires more than 3 slots for 3 persistent tasks

Runtime apps started by `pnpm dev`:

- `@lxp/gateway-api` on `3001`
- `@lxp/admin-api` on `3002`
- `@lxp/admin-web` on `3003`

Shared packages are not started as long-running `dev` processes by the root script.

Audit which workspace packages currently expose a `dev` script:

```bash
pnpm dev:audit
```

```powershell
pnpm.cmd dev:audit
```

Validate that the root runtime dev graph still targets only the three runtime apps:

```bash
pnpm dev:validate
```

```powershell
pnpm.cmd dev:validate
```

If you want to start the runtime apps individually, use:

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

### 5. Complete the setup wizard

Open:

```text
http://localhost:3003/setup
```

Use the setup token printed by `pnpm setup:init`.

On success, the wizard creates the first super admin, first tenant, initial tenant policy, encrypted provider credentials, and optionally an Open WebUI integration key returned once.

After setup completes, use:

```text
http://localhost:3003/login
```

### 5.1 Troubleshooting occupied ports

Check whether the required runtime ports are free:

```bash
pnpm dev:check
```

```powershell
pnpm.cmd dev:check
```

Reset the three expected local runtime ports on Windows PowerShell:

```powershell
pnpm.cmd dev:reset-ports
```

Inspect the targeted Turbo graph used for runtime startup:

```bash
pnpm exec turbo run dev --filter=@lxp/admin-web --dry=json
```

```powershell
pnpm.cmd exec turbo run dev --filter=@lxp/admin-web --dry=json
```

`turbo run dev --filter=@lxp/admin-web --concurrency=3` is not valid with Turbo 2.9.x for this setup because `admin-web`, `gateway-api`, and `admin-api` are all persistent tasks. Use `--concurrency=4` or `pnpm dev`.

### 4. Manual endpoint testing

Use the HTTP files in [queries/README.md](queries/README.md):

1. if the database is empty, run `Bootstrap First Admin` from `queries/admin-api.http`
2. run `queries/auth.http` to obtain tokens
3. use `queries/admin-api.http` for protected admin operations
4. use `queries/provider-credentials.http` to resolve `userUuid` and store provider credentials for Anthropic Claude, Google Gemini, Groq, NanoGPT, Ollama, OpenAI, OpenRouter, or xAI Grok
5. use `queries/gateway-api.http` for:
   - non-stream JSON chat
   - stream SSE chat with supported providers and thinking-capable models

See the gateway response contract in [docs/api/gateway-contract.md](docs/api/gateway-contract.md).

UI planning and backend-aligned UI architecture are documented in:

- [docs/architecture/ui-architecture.md](docs/architecture/ui-architecture.md)
- [docs/delivery/ui-implementation-plan.md](docs/delivery/ui-implementation-plan.md)
- [docs/architecture/decisions/ADR-006-web-session-and-runtime-config.md](docs/architecture/decisions/ADR-006-web-session-and-runtime-config.md)

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

Phase 2 should start from the current implemented baseline:

- stable provider seam and one working provider integration
- control-plane auth, user, and credential workflows
- role-aware SPA with mobile and desktop behavior
- test and CI foundations already in place

Suggested next priorities:

- refine OpenAPI so it reflects the implemented gateway and admin contracts
- add E2E coverage on critical flows using the existing `data-testid` anchors
- extend operational and administrative workflows without weakening current boundaries
