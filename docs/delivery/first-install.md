# First Install

This is the recommended first-time setup flow for a fresh local install of `lxp-llm-gateway`.

The canonical path is:

1. start local infrastructure
2. generate the root `.env` with the setup CLI
3. run TypeORM migrations
4. start the three runtime apps
5. complete the setup wizard in `admin-web`

The setup CLI prepares technical secrets and runtime URLs.
The setup wizard creates application data such as the first super admin, the first tenant, and optional provider credentials.

## 1. Start Local Infrastructure

From the repository root:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis
```

If you also want `Open WebUI` locally during install:

```powershell
docker compose -f infra/compose/docker-compose.dev.yml up -d postgres redis open-webui
```

## 2. Generate the Root `.env`

Run the setup CLI from the repository root:

```powershell
pnpm setup:init
```

The CLI will:

- create or update the root `.env`
- generate JWT and encryption secrets compatible with the current runtime
- generate a setup token
- store only `LXP_SETUP_TOKEN_HASH` in `.env`
- print the setup URL and raw setup token once

Important:

- store the setup token immediately
- the raw token is not recoverable from the hash later
- if `.env` already exists, the CLI lets you keep it, fill missing values, rotate only the setup token, or overwrite all values

Validate the result at any time with:

```powershell
pnpm setup:doctor
```

## 3. Run TypeORM Migrations

Run both application migration sets from the repository root:

```powershell
pnpm db:migration:admin
pnpm db:migration:gateway
```

This repository does not auto-create tables at startup.

## 4. Start the Runtime Apps

Recommended monorepo startup:

```powershell
pnpm dev
```

This starts:

- `gateway-api` on `http://localhost:3001`
- `admin-api` on `http://localhost:3002`
- `admin-web` on `http://localhost:3003`

## 5. Open the Setup Wizard

Browse to:

```text
http://localhost:3003/setup
```

Or use the exact URL printed by `pnpm setup:init`.

The setup wizard will ask for:

- the setup token printed by the CLI
- the first super admin identity
- the first tenant
- optional provider credentials to test live before saving
- optional Open WebUI integration bootstrap

## 6. Complete Installation

When the wizard succeeds, it will:

- create the first super admin
- create the first tenant
- create the initial membership and tenant policy
- store provider credentials using encrypted credential storage
- optionally create an Open WebUI integration client and one-time API key
- permanently close setup endpoints

If an Open WebUI API key is shown, copy it immediately.
It is returned only once.

## 7. Continue After Setup

After installation is complete:

- sign in at `http://localhost:3003/login`
- `GET /api/v1/setup/status` will report setup as completed
- token-guarded setup endpoints will no longer accept bootstrap actions

If you enabled Open WebUI integration, continue with:

- [Open WebUI Setup](./open-webui-setup.md)

## Troubleshooting

If the setup wizard does not open as expected:

1. run `pnpm setup:doctor`
2. confirm `postgres` and `redis` are running
3. confirm both migration commands completed successfully
4. confirm `admin-api`, `gateway-api`, and `admin-web` are all running

If setup was already completed, `/setup` should no longer be your primary entry point.
Use `/login` instead.
