# System Scope

## Goal

`lxp-llm-gateway` is a BYOK (bring your own key) platform foundation for routing LLM traffic through a consistent gateway while keeping provider integrations isolated behind a stable adapter seam.

## In Scope

- LLM gateway API
- admin control-plane API
- admin web application
- shared contracts and domain packages
- provider abstraction package
- working provider integrations for NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude
- user, role, and provider credential foundations
- local development infrastructure
- a first local Open WebUI integration path against `gateway-api`
- foundational documentation and API contract placeholders
- incremental UI refactor work that keeps `admin-web` maintainable as feature depth increases
- Phase 2 provider-seam expansion for image generation, image editing, and provider-owned image catalogs
- normalized multimodal chat content in the shared seam for text and `image_url` blocks

## Out of Scope for Phase 1

- additional providers beyond NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude
- billing and analytics
- quota enforcement
- policy engines
- event-driven workers
- advanced dashboards

## Phase 1 Success Criteria

- the monorepo structure is in place
- the apps and packages are operational, not placeholders
- the core architecture boundaries are documented
- the provider seam is explicit
- NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude can be selected transparently through the same gateway contract
- the repository is ready for iterative feature implementation
- the admin SPA remains operable on mobile and desktop without accumulating oversized, multi-responsibility modules as the feature surface grows

## Current End-of-Phase-1 State

The repository now contains:

- `admin-api` as the control-plane backend for auth, users, roles, provider credentials, runtime config, and conversation transfer support
- `gateway-api` as the data-plane backend for model listing, non-stream chat, and SSE chat streaming through the provider seam
- `gateway-api` as the data-plane backend for a thin OpenAI-compatible facade used by trusted internal clients such as `Open WebUI`
- `admin-web` as a role-aware SPA with public auth surfaces, user self-service, admin management, and a local chat test surface
- Postgres-backed durable control-plane persistence with encrypted provider credential storage
- Redis-backed auth revocation and other operational state where ephemeral behavior is appropriate
- BYOK provider access through user-managed provider credentials
- optional user correlation for Open WebUI traffic through a shared compatibility key plus forwarded user email header
- provider model discovery through provider adapters, including capability-specific model metadata
- tenant-aware control-plane and gateway foundations based on global users, tenant memberships, and an active tenant context
- tenant-aware technical client foundations based on integration clients and API keys
- tenant-aware audit and usage telemetry with an initial PostgreSQL RLS slice on telemetry tables
- tenant-aware technical client auth with an initial PostgreSQL RLS slice on `integration_clients` and `api_keys`
- shared-seam chat requests that can now carry either plain text content or normalized multimodal content blocks
- working provider integrations for NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude behind `packages/provider-sdk`
- frontend feature modules under `src/features/*`
- CI quality gates for typecheck, test, and build
- an initial `Image Generation Lab` in `admin-web` backed by gateway image-generation and image-editing endpoints
- operator-configurable gateway defaults for both chat and image generation/editing, with separate provider/model pairs
- a local Open WebUI use case that is intentionally trusted and compose-driven
- a production Open WebUI posture that keeps identity injection inside a trusted proxy boundary

## Phase 2 Starting Assumptions

Phase 2 should assume:

- the provider seam is already the canonical integration boundary
- tenant isolation is a mandatory boundary, not a best-effort convention
- cookie-only browser auth is the expected SPA posture
- the SPA codebase is already organized by feature and can continue to evolve incrementally
- CI quality gates already cover typecheck, test, and build
- new provider capabilities should extend `packages/provider-sdk`, not bypass it
- image history, save state, and gateway-managed reference assets belong in the application layer, not in provider packages
- image-provider packages should stay thin at the adapter boundary and split image concerns into provider catalog, model policy, transport client, request mapper, response mapper, and generation/edit services

The next planned capability expansion is:

- broader provider coverage for image generation and image editing behind the existing provider seam
- broader provider coverage for provider-owned image catalogs behind the existing provider seam
- provider-owned capability metadata such as supported aspect ratios, response formats, resolutions, output formats, background modes, quality presets, input fidelity, compression ranges, and request limits flowing from model catalogs to the UI
- future providers beyond the current NanoGPT, xAI, Google, OpenAI, and OpenRouter image implementations behind the same seam
- reference-image workflows that keep uploaded image handling and provider dispatch behind application APIs
- paginated image job history and reusable saved/generated assets for operators
- deployment hardening if Open WebUI identity correlation evolves into a full shared-identity story across both UIs
- broader provider-by-provider multimodal chat support for image attachments behind the existing seam

Current image-provider posture is:

- `NanoGPT` image models are exposed for generation and editing, with provider-owned capability metadata and paid-model distinctions flowing through the catalog
- `xAI Grok` image models are exposed for generation and editing
- `Google Gemini` image models are exposed for generation and editing
- `OpenAI GPT Image` is exposed for generation and editing through the same seam, with provider-owned capability metadata controlling the UI affordances
- `OpenRouter` is exposed for image generation and image editing through the same seam, with reused capability metadata where the underlying model family already exists in another provider package

Current multimodal chat posture is:

- the shared gateway chat contract can now carry structured `text` and `image_url` content blocks
- the OpenAI-compatible facade can preserve those blocks into the gateway seam for trusted internal clients such as Open WebUI
- provider support remains provider-specific
- providers that are still text-only in gateway chat should reject image attachments explicitly rather than accepting them partially

Phase 2 should not spend time re-litigating those foundation choices unless a concrete failure mode appears.

Current Open WebUI posture is:

- Open WebUI can talk to `gateway-api` through the OpenAI-compatible facade
- the gateway can aggregate models across the authenticated user's accessible providers
- the gateway can optionally resolve the effective user from `X-OpenWebUI-User-Email` when the deployment explicitly trusts that header
- this is enough to make provider usage follow the mapped gateway user in a trusted deployment, but it is not yet a full SSO/session-sharing implementation between Open WebUI and the admin SPA
- the gateway remains the BYOK and security authority, not Open WebUI
- production deployments should strip identity headers at the public proxy boundary and inject them only from trusted infrastructure
- gateway execution should emit tenant-aware audit and usage records for traceability and future quota/billing work
- the first database-level isolation backstop is now in place for telemetry through transaction-scoped `app.tenant_id` plus PostgreSQL RLS on `audit_logs` and `usage_events`
- technical-client authentication now also uses a database-level backstop by resolving API keys inside a transaction-scoped `app.api_key_hash` context before switching to `app.tenant_id`
