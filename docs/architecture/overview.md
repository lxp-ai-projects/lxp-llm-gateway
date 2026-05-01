# Architecture Overview

## System Context

The platform separates the data plane from the control plane.

- `admin-web` talks to `admin-api`
- `admin-web` talks to `gateway-api` for chat and model discovery
- clients or trusted internal callers talk to `gateway-api`
- trusted internal callers such as `Open WebUI` can use a thin OpenAI-compatible facade exposed by `gateway-api`
- `gateway-api` talks to provider adapters through `provider-sdk`
- `provider-nanogpt`, `provider-openrouter`, `provider-ollama`, `provider-groq`, `provider-google`, `provider-xai`, `provider-openai`, and `provider-anthropic` are concrete provider implementations behind the same seam

The seam is evolving from a chat-only adapter into a capability-oriented provider surface.

## Boundary Rules

### Data Plane

`gateway-api` handles:

- request intake
- caller authentication from cookie or bearer access token
- optional trusted OpenAI-compatible caller authentication from a shared API key plus forwarded user identity headers
- identity resolution from `emailHash`
- provider credential resolution
- provider dispatch
- model listing
- streaming passthrough
- normalized non-stream response delivery
- capability-specific execution such as image generation and image editing through the same provider seam
- an OpenAI-compatible HTTP facade for trusted internal clients without bypassing the shared provider seam

It must not import provider-specific implementation details directly.

### Control Plane

`admin-api` manages:

- login, refresh, logout, and session resolution
- users and role-aware admin workflows
- encrypted provider credential writes and resets
- runtime config for the SPA
- conversation import and export support
- control-plane health and settings surfaces

`admin-api` is the durable source of truth for control-plane identity and secret administration.

`admin-web` is the operator-facing SPA for both administrator and end-user control-plane workflows.

### Shared Packages

- `contracts` contains transport-layer contracts
- `domain` contains framework-agnostic domain concepts
- `provider-sdk` defines the provider integration seam
- `provider-nanogpt` implements NanoGPT behind the seam
- `provider-openrouter` implements OpenRouter behind the seam
- `provider-ollama` implements Ollama behind the seam
- `provider-groq` implements Groq behind the seam
- `provider-google` implements Google Gemini behind the seam
- `provider-xai` implements xAI Grok behind the seam
- `provider-openai` implements OpenAI behind the seam
- `provider-anthropic` implements Anthropic Claude behind the seam

`provider-sdk` should remain capability-oriented rather than provider-shaped.

The seam should expose explicit surfaces for:

- chat completion
- model catalog listing
- image provider catalog listing
- image generation
- image editing with reference images

For chat, that shared seam now also carries normalized message content in either of these forms:

- a plain string
- a list of normalized content blocks such as `text` and `image_url`

Model catalog results may also carry capability-specific metadata needed by the UI and gateway orchestration, such as:

- image-capable model flags
- provider-defined supported image aspect ratios
- provider-defined supported image response formats and resolutions
- provider-defined output formats, background modes, fidelity levels, quality presets, and compression ranges
- provider-defined request limits such as max generated images or max reference images

`gateway-api` must orchestrate those surfaces without learning provider-specific endpoint rules.

Shared image-reference safety rules that apply across providers should live in the provider seam rather than being reimplemented independently in each adapter.

## Persistence Posture

The current architecture uses relational persistence for:

- tenants
- tenant memberships
- users
- roles
- provider credentials

Postgres is the durable source of truth for control-plane identity and encrypted provider secrets.

The tenant boundary is now modeled explicitly:

- `users` remain global identities
- `tenants` represent isolation domains
- `tenant_memberships` attach users to tenants with tenant-scoped roles
- tenant-owned tables must carry `tenant_id`
- tenant-aware credential resolution prefers user-scoped credentials only when the tenant allows override, then falls back to tenant defaults
- technical clients such as `Open WebUI` should authenticate through tenant-scoped `integration_clients` and `api_keys`, with forwarded human identity treated only as an optional bounded enhancement
- `audit_logs` and `usage_events` now also use PostgreSQL row-level security as a second line of defense, with the gateway setting `app.tenant_id` transactionally before telemetry writes
- `integration_clients` and `api_keys` now also use PostgreSQL row-level security, with technical-client key lookup bootstrapped through a transaction-scoped `app.api_key_hash` before the gateway narrows the session to `app.tenant_id`
- `image_assets`, `image_jobs`, and `image_job_results` now also use PostgreSQL row-level security, with image reads and writes executed inside transaction-scoped tenant context
- `user_provider_credentials` now also uses PostgreSQL row-level security, with both `gateway-api` runtime resolution and `admin-api` credential management executing inside transaction-scoped tenant context

Redis is used for short-lived auth and operational state such as:

- revoked token tracking
- refresh rotation state
- gateway circuit-breaker state if stored outside Postgres

## Security Posture

The initial architecture assumes:

- secure admin authentication
- encrypted provider credentials
- clear identity boundaries
- no unsafe browser token storage patterns
- cookie-only browser session posture for the SPA
- application-level encryption for stored provider API secrets
- authenticated tenant resolution from a trusted session, JWT claim, or technical integration context
- short-lived access tokens with server-side revocation support
- gateway-side identity resolution from `emailHash`, not a caller-supplied internal user id
- optional trusted-header correlation for OpenAI-compatible internal callers only when a shared API key and trusted deployment boundary are in place
- separate local and deployed Open WebUI runtime profiles so that permissive lab settings do not silently become production defaults
- generalized error handling that avoids overexposing account and token state to callers
- write-only or masked-only handling for provider secrets in administrative workflows
- no tenant-owned repository access without tenant scoping in the application layer
- a first RLS slice is active for tenant-owned telemetry tables, with broader table coverage still treated as follow-on hardening work
- technical-client authentication now has a database-level backstop for `integration_clients` and `api_keys`
- image history, asset access, and image-job persistence now also have a database-level tenant isolation backstop
- BYOK credential resolution and administration now also have a database-level tenant isolation backstop

## UI Posture

Phase 1 uses one SPA with role-aware navigation:

- admins see administrative and user self-service surfaces
- users see only self-service and chat-test surfaces

The SPA reads:

- session state from backend auth endpoints
- feature flags from a public runtime-config endpoint
- local chat persistence from IndexedDB

The UI codebase should evolve toward small feature modules rather than large page-bound files that combine transport, orchestration, persistence, and rendering concerns in one place.

That refactor direction is already underway in `admin-web` through `features/auth`, `features/chat`, `features/providers`, and `features/users`.

Refactor work that improves SRP, DRY, and testability remains in scope when it preserves behavior and keeps the feature delivery posture truthful.

Interactive surfaces should expose stable test anchors for future end-to-end automation.

The preferred browser automation convention is a minimal `data-testid` policy applied only to:

- user-triggered controls
- durable page anchors
- repeated dynamic items that need deterministic selection

## Primary Risk

The main architectural failure mode is leaking provider-specific logic into `gateway-api`.

If that boundary collapses, the new repository will recreate the coupling problems it was meant to eliminate.

## Provider Access Posture

The seam must support transparent provider execution without forcing `gateway-api` to understand each provider's auth model.

Provider adapters receive a provider access configuration that may contain:

- `apiKey`
- `baseUrl`
- provider-scoped headers

This allows:

- `NanoGPT` and `OpenRouter` to use bearer-token style auth
- `Groq` to use bearer-token auth through an OpenAI-compatible endpoint
- `Google Gemini` to use bearer-token auth for chat through Google's OpenAI-compatible Gemini API and `x-goog-api-key` auth for native image generation through Gemini `generateContent`
- `xAI Grok` to use bearer-token auth through an OpenAI-compatible endpoint
- `OpenAI` to use bearer-token auth through the OpenAI chat completions, models, and images endpoints
- `Anthropic Claude` to use `x-api-key` auth plus Anthropic-specific message and model endpoints
- `Ollama` to use either a local/runtime endpoint or Ollama Cloud with bearer auth

`gateway-api` resolves and decrypts provider access data, but it does not interpret provider-specific transport rules.

The same posture now applies when `gateway-api` is called through the OpenAI-compatible facade used by `Open WebUI`:

- the facade only translates transport shape such as `/models` and `/chat/completions`
- provider selection and credential resolution still happen inside the gateway against the authenticated or correlated internal user
- forwarded user identity from Open WebUI remains an application-level trust decision, not a provider concern
- for local development, a shared compatibility API key plus a trusted forwarded email header is acceptable
- for a deployed VPS or externally reachable environment, the trusted header should only be accepted from a reverse proxy or other bounded trust zone
- for a deployed VPS or externally reachable environment, the compatibility facade should remain on an internal path when possible, with the public edge stripping user-identity headers before requests reach the trusted Open WebUI deployment
- for stronger long-term production posture, user correlation should eventually sit behind `OIDC`, `proxy-auth`, or another authenticated trusted boundary rather than relying only on a plain forwarded email header
- the Open WebUI client must not be treated as the source of truth for provider access or usage attribution
- `gateway-api` remains the BYOK and authorization authority for provider credentials, defaults, and request execution

## Provider Capability Expansion

The seam now supports image generation, image editing, and image-provider catalog listing through the shared adapter surface.

The seam also now supports normalized multimodal chat inputs so that OpenAI-compatible clients can send image attachments without pushing client-specific payload rules into `gateway-api`.

That expansion should preserve the current boundary by extending `provider-sdk` with explicit capability contracts instead of adding provider-specific branching in `gateway-api`.

The architectural direction is:

- keep chat and image workflows as separate capability methods
- keep multimodal chat content normalized at the seam instead of teaching `gateway-api` OpenAI-, Anthropic-, or provider-native attachment payload shapes
- keep capability support explicit per adapter rather than inferred from provider id
- allow model catalogs to remain provider-owned, capability-aware, and able to expose normalized capability metadata such as supported image aspect ratios, response formats, resolutions, output formats, quality presets, background modes, fidelity controls, compression ranges, lifecycle state, and request limits
- allow image requests to carry prompt text plus zero or more reference images
- keep provider-specific payload mapping inside provider packages

Reference images should be passed through the seam in normalized forms such as:

- public image URLs
- data URLs for uploaded or local image content

When a provider cannot consume remote URLs directly, the provider package may still normalize public HTTPS image URLs into provider-native inputs by using shared seam utilities, but it must still opt into and preserve the security controls for that fetch path.

At minimum, that means blocking localhost, private-network targets, and unsupported content types before any bytes are forwarded to the upstream provider.

The first concrete provider implementations are xAI Grok Imagine behind `packages/provider-xai`, Google Nano Banana behind `packages/provider-google`, and OpenAI GPT Image behind `packages/provider-openai`.

Per the xAI docs, image operations use dedicated image endpoints rather than chat endpoints:

- `/v1/images/generations` for prompt-based generation
- `/v1/images/edits` for prompt-based editing with source images

Those endpoint details belong only in the xAI provider package.

Per the Google Gemini docs, image operations use the native Gemini `generateContent` API rather than the OpenAI-compatible chat surface already used for text workflows.

Those provider-specific details also belong only in the Google provider package.

Per the OpenAI docs, image generation uses `/v1/images/generations`, while image edits are documented as multipart requests against `/v1/images/edits`.

Those provider-specific details also belong only in the OpenAI provider package.

At the moment, the gateway exposes OpenAI GPT Image as generation and editing through the shared seam. The provider package owns the image-specific request and response mapping, while the gateway stays unaware of the endpoint shape.

OpenRouter now supports image generation and image editing behind the same seam through `/api/v1/chat/completions`, with image-capable model discovery, provider-owned option mapping, reference-image message construction, and normalized image-response parsing inside `packages/provider-openrouter`.

The seam itself should only know about normalized image-generation and image-editing requests and responses, provider image catalogs, and shared image-reference utilities.

The application layer now owns:

- image provider catalog aggregation for UI consumption
- gateway-managed image asset upload and retrieval
- image job persistence and paginated history
- save state for generated assets
- resolution of gateway-managed asset references into provider-consumable image inputs before provider dispatch

Provider adapters remain responsible only for:

- provider communication
- provider-owned model catalogs and defaults
- provider-owned image catalogs and defaults
- provider-specific validation and payload mapping
- provider-specific response normalization

The current image-provider implementation pattern is now explicit across `provider-openai`, `provider-xai`, `provider-google`, `provider-nanogpt`, and `provider-openrouter`:

- a provider-owned image catalog/registry for model descriptors and defaults
- a provider model-policy module for capability checks and request validation
- a provider transport client for upstream HTTP concerns
- provider-specific request mappers
- provider-specific response mappers
- thin generation and edit services
- a thin adapter that orchestrates those pieces and exposes only the shared seam

That pattern is the reference architecture for future image-capable providers.

The intent is:

- `index.ts` remains a composition root only
- catalog changes should be mostly declarative when adding or retiring a model
- model capability decisions stay centralized in provider-owned policy modules
- request normalization, endpoint choice, HTTP transport, and response parsing must not collapse back into a single class
- `gateway-api` continues to see only the shared provider seam, not provider-specific image endpoint rules
- new image-capable providers should follow the same pattern now used by NanoGPT, OpenAI, xAI, Google, and OpenRouter

## OpenAI-Compatible Internal Clients

`gateway-api` now also exposes a thin OpenAI-compatible surface for trusted internal clients such as `Open WebUI`.

That facade currently covers:

- `GET /api/v1/openai/models`
- `POST /api/v1/openai/chat/completions`

Its architectural role is intentionally narrow:

- translate a standard OpenAI-compatible transport into the existing gateway request shape
- aggregate model discovery across accessible providers
- preserve the existing provider seam, credential resolution, and gateway-owned auditing behavior

It must not become a parallel provider implementation layer.

The first supported use case is local `Open WebUI` talking to a host-run `gateway-api` through Docker Compose.

Open WebUI can also forward user identity headers such as `X-OpenWebUI-User-Email`.

When explicitly enabled in the gateway runtime, those headers allow per-user credential resolution against the existing gateway user table.

This gives the platform a practical identity-correlation path for Open WebUI traffic without teaching provider packages anything about Open WebUI itself.

For chat payloads, the facade can now translate OpenAI-style multimodal message content into the gateway's normalized chat-content blocks.

That does not mean every provider supports chat image attachments yet.

Current provider behavior remains explicit:

- providers with chat adapters that still only support text must reject image attachments clearly
- the compatibility facade still covers `/models` and `/chat/completions`, not provider image-generation endpoints

## UI Direction

The operator-facing surface for this capability is an `Image Generation Lab` in `admin-web`.

That UI should remain behind the same backend boundaries already used for chat:

- `admin-web` should talk to application APIs, not directly to providers
- provider credential reuse should follow the existing BYOK model
- reference image upload, prompting, result display, save actions, and history pagination should be capability-specific UI concerns, not provider-specific page logic
