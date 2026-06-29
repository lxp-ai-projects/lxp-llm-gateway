# Laurie Codex Task — `lxp-llm-gateway` easy setup alpha hardening

## Context

Repository: `lxp-ai-projects/lxp-llm-gateway`
Branch: `feature/easy-setup`

The branch is close to a useful alpha path, but the current setup story is inconsistent. The product goal is not to add new features. The goal is to make the branch coherent enough to validate a real VPS deployment and connect Open WebUI as the first external client.

Use this document as the working brief.

---

## Main objective

Make `feature/easy-setup` internally consistent and alpha-testable.

The alpha success path is:

```text
fresh clone
env generation
docker compose up
migrations run
admin-api health OK
gateway-api health OK
admin-web reachable
first admin bootstrap works
provider credential can be added
OpenAI-compatible endpoint lists models
Open WebUI sends a message through lxp-llm-gateway
gateway returns a response
```

The release gate is not “the containers start.”

The release gate is:

```text
Open WebUI -> lxp-llm-gateway -> provider -> assistant response received
```

No samba before the first `200 OK`.

---

## Non-goals

Do not turn this into a product expansion.

Avoid:

- adding new providers
- redesigning the admin UI
- adding companion/persona features
- building a new Open WebUI replacement
- changing the product positioning
- large refactors unrelated to setup/deployment
- speculative production hardening beyond the current VPS alpha path

This task is about setup coherence, deployment validation, and documentation truth.

---

## Current observed issues to verify first

Before editing, inspect the repository directly and confirm the current state.

### 1. Quickstart script mismatch

The root `package.json` contains scripts like:

```json
"setup:quickstart": "node ./scripts/setup-quickstart.mjs up",
"setup:quickstart:down": "node ./scripts/setup-quickstart.mjs down",
"setup:quickstart:logs": "node ./scripts/setup-quickstart.mjs logs"
```

But the observed `scripts/` directory does not contain `setup-quickstart.mjs`.

Expected action:

Either implement `scripts/setup-quickstart.mjs`, or remove/replace the advertised quickstart scripts and README references.

Preferred action for this alpha:

Implement a minimal `scripts/setup-quickstart.mjs` that works.

It should support:

```bash
pnpm setup:quickstart
pnpm setup:quickstart -- --open-webui
pnpm setup:quickstart:logs
pnpm setup:quickstart:down
```

The script should be boring and reliable.

It may wrap Docker Compose commands rather than becoming a complex wizard.

---

### 2. Missing `docs/setup/quickstart.md`

The README references:

```text
docs/setup/quickstart.md
```

But the observed `docs/setup/` folder only contains `vps.md`.

Expected action:

Create `docs/setup/quickstart.md`.

It should document the local alpha path only:

```bash
pnpm install
pnpm setup:quickstart
pnpm setup:quickstart -- --open-webui
```

It must include validation commands for:

```bash
curl http://localhost:3002/api/v1/health
curl http://localhost:3001/api/v1/health
curl http://localhost:3003
```

If Open WebUI is enabled:

```text
http://localhost:3004
```

Also include a short troubleshooting section for:

- missing Docker
- occupied ports
- stale Open WebUI volume
- migrations failing
- empty model list
- provider credential missing
- gateway cannot reach provider

---

### 3. VPS compose mismatch

The README and `docs/setup/vps.md` reference:

```text
infra/compose/docker-compose.vps.yml
infra/compose/lxp-gateway.vps.env.example
```

But the observed `infra/compose/` directory contains the dev compose and Open WebUI VPS compose files, not the core gateway VPS compose file or core VPS env template.

Expected action:

Create:

```text
infra/compose/docker-compose.vps.yml
infra/compose/lxp-gateway.vps.env.example
```

The core VPS compose should start:

```text
postgres
redis
admin-api-migrate
gateway-api-migrate
admin-api
gateway-api
admin-web
```

Use loopback-only published ports:

```text
127.0.0.1:3001 -> gateway-api
127.0.0.1:3002 -> admin-api
127.0.0.1:3003 -> admin-web
```

Do not publicly expose Postgres or Redis.

The compose file should be compatible with:

```bash
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```

---

### 4. VPS env generator must align with the template

The helper scripts exist:

```text
scripts/generate-vps-env.sh
scripts/Generate-VpsEnv.ps1
```

Expected action:

Validate that both scripts generate a `.env.lxp-gateway.vps` compatible with `infra/compose/docker-compose.vps.yml`.

The generated file must include all variables required by:

- Postgres
- Redis if needed
- admin-api
- gateway-api
- admin-web
- migration jobs
- OpenAI-compatible gateway mode

Important invariants:

```text
LXP_VPS_EMAIL_LOOKUP_KEY must match between admin-api and gateway-api
LXP_VPS_ENCRYPTION_MASTER_KEY must stay stable once provider credentials are stored
LXP_VPS_COOKIE_SECRET must be strong
LXP_VPS_JWT_PRIVATE_KEY must be valid for the current auth implementation
LXP_VPS_OPENAI_COMPAT_API_KEY must match the key used by Open WebUI
LXP_VPS_OPENAI_COMPAT_DEFAULT_USER_EMAIL must correspond to a real gateway user
```

If the runtime uses different env variable names inside the apps, map the `LXP_VPS_*` variables correctly in Compose.

---

### 5. Fix broken or local-only markdown links

`docs/setup/vps.md` contains links that appear to point to a local Windows path such as:

```text
/C:/Data/Workspace/TypeScript/lxp-llm-gateway/...
```

Expected action:

Replace those with relative repository links.

Example:

```md
[infra/compose/docker-compose.vps.yml](../../infra/compose/docker-compose.vps.yml)
```

Also check README links and Open WebUI docs for broken links.

---

### 6. Reformat docs if needed

Some raw markdown files appear compressed into very long lines.

Expected action:

Ensure the markdown files are human-editable and readable in GitHub.

Affected candidates:

```text
docs/setup/vps.md
docs/delivery/open-webui-setup.md
scripts/generate-vps-env.sh
infra/proxy/caddy/lxp-gateway.Caddyfile.example
```

Do not change meaning unless required.

---

## Preferred implementation plan

### Step 1 — Inspect

Run:

```bash
git status
find scripts -maxdepth 1 -type f | sort
find infra/compose -maxdepth 1 -type f | sort
find docs/setup -maxdepth 1 -type f | sort
cat package.json
```

Confirm what exists before changing anything.

---

### Step 2 — Make README truthful

The README should advertise only paths that actually work.

At minimum, after this task, these commands must not point to missing files:

```bash
pnpm setup:quickstart
pnpm setup:quickstart -- --open-webui
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```

---

### Step 3 — Implement the missing local quickstart path

Create `scripts/setup-quickstart.mjs`.

Keep it simple.

Suggested behavior:

```text
up:
  - optionally generate local env files if missing
  - start postgres and redis
  - run admin and gateway migrations
  - start admin-api, gateway-api, admin-web
  - optionally start open-webui when --open-webui is present

logs:
  - tail relevant compose logs

down:
  - stop quickstart services
```

Use existing compose files where possible.

Do not invent a second full orchestration system.

If the current dev compose does not support everything required, minimally adjust it.

---

### Step 4 — Add core VPS compose and env template

Create:

```text
infra/compose/docker-compose.vps.yml
infra/compose/lxp-gateway.vps.env.example
```

The VPS compose should:

- bind app ports to loopback only
- keep databases internal or loopback-only
- run migrations before runtime services
- use restart policies for runtime services
- avoid committing secrets
- avoid dev-only defaults
- be readable and boring

The env template should be complete enough that the generator can produce a valid file from it or mirror it.

---

### Step 5 — Align VPS docs

Update `docs/setup/vps.md`.

It should include:

1. prerequisites
2. clone branch
3. generate `.env.lxp-gateway.vps`
4. start core compose
5. verify loopback health
6. add Caddy reverse proxy
7. bootstrap first admin
8. add provider credential
9. test OpenAI-compatible model listing
10. optionally connect Open WebUI
11. troubleshooting

Keep Open WebUI optional but make it the alpha validation target.

---

### Step 6 — Open WebUI alpha validation

The Open WebUI target should validate:

```text
Open WebUI -> gateway-api OpenAI-compatible endpoint -> provider -> response
```

Document the minimal Open WebUI settings:

```text
Base URL: https://<gateway-domain>/api/v1/openai
API Key: <LXP_VPS_OPENAI_COMPAT_API_KEY>
```

For local dev, document:

```text
Base URL: http://host.docker.internal:3001/api/v1/openai
```

or the actual working value from the compose topology.

The exact URL path must match the current gateway implementation.

Confirm whether the implementation uses:

```text
/api/v1/openai
```

or:

```text
/v1
```

Do not document both as equivalent unless both actually work.

---

## Acceptance criteria

The task is complete only when the following pass on a clean checkout.

### Repository consistency

- `pnpm setup:quickstart` does not fail due to a missing script.
- `docs/setup/quickstart.md` exists.
- `infra/compose/docker-compose.vps.yml` exists.
- `infra/compose/lxp-gateway.vps.env.example` exists.
- README links point to existing files.
- VPS docs do not contain local Windows path links.
- Docs are readable in GitHub.

### Local quickstart

From a clean local environment:

```bash
pnpm install
pnpm setup:quickstart
```

Then:

```bash
curl http://localhost:3002/api/v1/health
curl http://localhost:3001/api/v1/health
curl http://localhost:3003
```

All expected services respond.

If using Open WebUI:

```bash
pnpm setup:quickstart -- --open-webui
```

Then:

```text
Open WebUI loads at http://localhost:3004
```

### VPS alpha path

On a VPS:

```bash
LXP_VPS_ADMIN_DOMAIN=admin.example.com \
LXP_VPS_GATEWAY_DOMAIN=gateway.example.com \
LXP_VPS_DEFAULT_USER_EMAIL=ops@example.com \
bash ./scripts/generate-vps-env.sh

docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```

Then:

```bash
curl http://127.0.0.1:3002/api/v1/health
curl http://127.0.0.1:3001/api/v1/health
curl http://127.0.0.1:3003
```

All expected services respond.

### First admin and provider

After reverse proxy is configured:

```bash
curl -X POST https://admin.example.com/api/v1/bootstrap/admin \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "ChangeMe123!",
    "displayName": "First Admin"
  }'
```

Then:

- admin login works through HTTPS
- a BYOK provider credential can be stored
- model discovery works for that provider
- non-streaming chat works
- streaming chat works if already supported

### Open WebUI integration

Open WebUI can connect to the gateway using the OpenAI-compatible endpoint.

Required proof:

- model list appears or a documented manual model ID works
- a chat message sent from Open WebUI reaches `gateway-api`
- `gateway-api` resolves the compatibility key
- `gateway-api` resolves the target user
- provider is called
- assistant response is returned to Open WebUI
- gateway logs clearly show request, provider, model, status, and failure reason if applicable

---

## Quality bar

This is not about beauty. This is about reliability.

A good result is:

```text
boring
documented
repeatable
minimal
easy to validate
hard to misunderstand
```

Do not hide failures behind cute output.

If something fails, make the message actionable.

Bad:

```text
Stream interrupted.
```

Good:

```text
Provider credential exists, but selected model did not respond.
Check provider key, selected model ID, and outbound network access from the VPS.
```

---

## Output expected from Codex

When done, provide:

1. files changed
2. commands run
3. validation results
4. remaining known gaps
5. exact next command Patrick should run on the VPS

Example final section:

````md
## Next VPS command

```bash
git pull
LXP_VPS_ADMIN_DOMAIN=...
LXP_VPS_GATEWAY_DOMAIN=...
LXP_VPS_DEFAULT_USER_EMAIL=...
bash ./scripts/generate-vps-env.sh
docker compose --env-file .env.lxp-gateway.vps -f infra/compose/docker-compose.vps.yml up -d --build
```
````

---

## Guiding principle

Do not build a cathedral.

Make the first deployment path work.

First `200 OK`, then elegance.
