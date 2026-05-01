# lxp-llm-gateway Scope

## Purpose

`lxp-llm-gateway` is a new monorepo for a multi-provider LLM gateway platform.

The goal is to start from a clean architecture instead of carrying forward the structural debt of the previous proxy implementation.

The repository must provide:

- a gateway API for LLM traffic
- an OpenAI-compatible gateway facade for trusted internal clients such as Open WebUI
- an admin API for control-plane operations
- an admin web application for management workflows
- shared packages for contracts, domain concepts, and provider integration seams

## Delivery Philosophy

The initial implementation must be intentionally minimal.

It should:

- preserve the lessons learned from the previous project
- avoid speculative packages and premature abstractions
- establish healthy boundaries from day one
- keep provider expansion behind the seam without leaking provider-specific logic into `gateway-api`

## Initial Product Scope

Phase 1 includes:

- a functional monorepo workspace
- foundational documentation
- an operational `gateway-api`
- an operational `admin-api`
- an operational `admin-web`
- a provider abstraction layer kept behind `provider-sdk`
- a single provider implementation: `NanoGPT`
- Postgres persistence for users, roles, and encrypted provider credentials
- Redis-backed auth/session operational state
- local development infrastructure
- CI-ready scripts and workflows for typecheck, build, and test, with coverage as an informative signal
- working provider implementations for:
  - `NanoGPT`
  - `OpenRouter`
  - `Ollama`
  - `Groq`
  - `Google Gemini`
  - `xAI Grok`
  - `OpenAI`
  - `Anthropic Claude`
- local development infrastructure with Redis or Valkey
- a first local integration use case with Open WebUI against the host-run gateway
- an initial OpenAPI placeholder
- basic CI-ready scripts for lint, build, and test
- incremental UI hardening and refactor work that preserves behavior while improving maintainability, testability, and mobile operability

Phase 1 does not include:

- a broad provider marketplace beyond `NanoGPT`, `OpenRouter`, `Ollama`, `Groq`, `Google Gemini`, `xAI Grok`, `OpenAI`, and `Anthropic Claude`
- quota engines
- policy engines
- advanced billing or cost governance
- event-driven workers
- speculative subsystems beyond the current control-plane and gateway needs

The repository now treats multi-tenancy as a first-class architectural concern:

- users remain global identities
- tenant isolation is enforced through `tenants`, `tenant_memberships`, and an active tenant session context
- tenant-owned data must carry `tenant_id`
- provider credential resolution must remain tenant-aware and support tenant-default plus user-override behavior

## Recommended Stack

### Workspace and Tooling

- `pnpm`
- `turbo`
- `typescript`
- `eslint`
- `prettier`

### Backend

- `NestJS`
- `Jest`
- `OpenAPI / Swagger`
- `class-validator`
- `class-transformer`

Durable control-plane persistence is now handled by Postgres.

Redis remains part of the phase for revocation, refresh rotation state, and similar short-lived operational concerns.

### Frontend

- `React 19`
- `Vite`
- `TypeScript`
- `Mantine UI`
- `react-router-dom`
- `@tanstack/react-query`
- `i18next`
- `Vitest`

### Local Infrastructure

- `Docker`
- `Docker Compose`
- `Redis` or `Valkey`

## Initial Repository Structure

```text
lxp-llm-gateway/
|-- AGENTS.md
|-- README.md
|-- package.json
|-- pnpm-workspace.yaml
|-- turbo.json
|-- tsconfig.base.json
|-- .gitignore
|-- .editorconfig
|-- .prettierrc.json
|-- eslint.config.js
|
|-- docs/
|   |-- architecture/
|   |   |-- overview.md
|   |   `-- decisions/
|   |-- delivery/
|   |   `-- roadmap.md
|   |-- product/
|   |   `-- system-scope.md
|   `-- api/
|       `-- openapi.yaml
|
|-- apps/
|   |-- gateway-api/
|   |-- admin-api/
|   `-- admin-web/
|
|-- packages/
|   |-- contracts/
|   |-- domain/
|   |-- provider-sdk/
|   `-- provider-nanogpt/
|
`-- infra/
    `-- compose/
```

## Application Boundaries

### `apps/gateway-api`

Responsibilities:

- receive LLM requests
- select a provider
- execute through a provider adapter
- support streaming responses
- return normalized responses
- expose a thin OpenAI-compatible `/models` and `/chat/completions` facade for trusted internal callers without bypassing provider-sdk

This is the data plane.

### `apps/admin-api`

Responsibilities:

- admin and user authentication
- provider credential management
- settings and configuration management
- future policy, quota, and routing administration

This is the control plane.

### `apps/admin-web`

Responsibilities:

- login
- user and provider management
- settings management
- future admin dashboards

Phase 1 frontend code must remain decomposable.

The current codebase already refactors the SPA toward:

- focused feature modules under `src/features/*`
- small hooks with explicit state ownership
- thin page-level orchestration
- stable test anchors for future end-to-end automation

## Shared Package Boundaries

### `packages/contracts`

Transport-level contracts shared across applications:

- request and response DTOs
- error payloads
- auth payloads
- frontend-backend API shapes

### `packages/domain`

Pure domain concepts that are not tied to NestJS or React:

- provider identifiers
- capability models
- routing concepts
- execution context types

### `packages/provider-sdk`

Provider abstraction seam:

- adapter interfaces
- normalized provider result types
- shared provider execution contracts
- capability-oriented contracts for chat, model catalog, image generation, and image editing
- provider-owned model metadata for capability-specific constraints such as supported image aspect ratios, response formats, resolutions, output formats, quality presets, background modes, input fidelity, compression ranges, and request limits
- provider access configuration that can represent:
  - bearer-token providers such as `NanoGPT` and `OpenRouter`
  - endpoint-based providers such as `Ollama`

The seam should evolve by adding new capability contracts, not by teaching `gateway-api` provider-specific image endpoints or payload formats.

### Provider Packages

Concrete provider implementations currently shipped in Phase 1:

- `packages/provider-nanogpt`
- `packages/provider-openrouter`
- `packages/provider-ollama`
- `packages/provider-groq`
- `packages/provider-google`
- `packages/provider-xai`
- `packages/provider-openai`
- `packages/provider-anthropic`

Each package owns:

- request and response mapping
- streaming adaptation
- provider-specific integration logic
- provider-owned image model catalogs and defaults
- provider-scoped transport clients and capability handlers for image workflows

## Critical Architecture Rule

`gateway-api` must not depend directly on NanoGPT implementation details.

It must depend on the provider abstraction defined in `packages/provider-sdk`.

`packages/provider-nanogpt` is an implementation module behind that seam.

This is the most important boundary to preserve from the start.

## Early Domain and Contract Concepts

### Domain

- `ProviderId`
- `ProviderCapability`
- `ModelCapability`
- `StreamSupport`
- `GatewayRequestContext`

### Contracts

- `GatewayChatRequest`
- `GatewayChatResponse`
- `GatewayErrorResponse`
- `ProviderCredentialPayload`
- admin authentication payloads

## Provider Adapter Shape

```ts
export interface ProviderCapabilities {
  chat: boolean;
  modelCatalog: boolean;
  imageGeneration: boolean;
  imageEditing: boolean;
}

export interface LlmProviderAdapter {
  readonly providerId: string;
  readonly capabilities: ProviderCapabilities;

  supportsStreaming(): boolean;

  listModels?(context: ProviderExecutionContext): Promise<ProviderModel[]>;

  chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse>;

  chatStream?(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream>;

  generateImage?(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse>;

  editImage?(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse>;
}
```

The execution context passed through the seam may contain a provider access configuration rather than only a raw API key.

That access configuration can include:

- `apiKey`
- `baseUrl`
- provider-scoped headers when required

The first version does not need to be perfect.

It does need to:

- isolate provider-specific logic
- make additional capabilities possible without reshaping `gateway-api` around a single provider
- keep the gateway application clean

The seam now includes image generation, image editing, and provider-owned image catalogs.

The chat seam also now supports normalized multimodal message content for:

- plain text strings
- structured `text` content blocks
- structured `image_url` content blocks

That capability is owned by the shared seam so trusted OpenAI-compatible clients such as Open WebUI can send multimodal chat payloads without teaching `gateway-api` provider-specific attachment formats.

The gateway layer now also includes an OpenAI-compatible facade for trusted internal clients.

That facade is still part of the gateway boundary, not a provider package concern.

It exists to let protocol-oriented tools such as Open WebUI call the gateway while reusing the same identity, credential-resolution, routing, and provider-seam behavior.
For local development, that integration may use a shared compatibility API key plus a trusted forwarded user header.
For deployed environments, the trusted header must only be accepted from a bounded trust boundary such as a reverse proxy.

The first concrete implementations are:

- xAI Grok Imagine through `provider-xai`
- Google Nano Banana through `provider-google`
- OpenAI GPT Image through `provider-openai`

That capability now supports:

- prompt-based image generation
- prompt-based image editing
- reference images supplied as URLs or data URLs
- provider-defined image model metadata such as supported aspect ratios, response formats, resolutions, output formats, backgrounds, quality presets, input fidelity, compression ranges, and request limits
- future extension to additional providers without redefining the seam again

Current provider reality is capability-specific:

- `xAI Grok` image models support generation and editing
- `Google Gemini` image models support generation and editing
- `OpenAI GPT Image` supports generation and editing in the gateway through the shared seam
- `OpenRouter` supports image generation and image editing through the shared seam, with provider-owned catalog metadata and capability reuse for known model families
- chat-level image attachments are now preserved through the shared chat seam as normalized `image_url` blocks
- providers that do not yet implement multimodal chat consumption, such as `Anthropic Claude` and `Ollama`, reject chat image attachments explicitly rather than failing with an opaque transport error

## Persistence Strategy

Phase 1 uses:

- Postgres for users, roles, and encrypted provider credentials
- Redis or Valkey for token revocation, refresh rotation support, and similar short-lived operational state

This keeps durable identity and secret state out of ephemeral infrastructure while preserving simple operational behavior.

## Security Constraints

These rules apply from the scaffold stage:

- do not store JWTs in `localStorage`
- prefer `HttpOnly` cookie-based admin auth or an equally defensible approach
- do not rely long-term on weak gateway authentication conventions
- encrypt provider credentials at rest
- keep caller identity, user identity, and provider credentials clearly separated

The implementation may begin simply, but the boundaries must be sound from the beginning.

For OpenAI-compatible internal clients such as Open WebUI, the current security posture is:

- a shared compatibility API key can authenticate the client itself
- forwarded user email headers can be trusted only when the deployment boundary is controlled
- per-user provider credential resolution still happens in `gateway-api`
- this is identity correlation for inference traffic, not yet a full shared-session SSO story across all UIs
- public requests must not be able to supply or preserve trusted identity headers
- the Open WebUI deployment should strip untrusted identity headers at the public edge and inject them only from the trusted boundary
- for deployed environments, only Open WebUI should be public-facing when possible, while the OpenAI-compatible gateway facade remains on an internal path
- local and deployed Open WebUI profiles should stay explicitly separate so permissive lab settings do not drift into VPS deployments
- the long-term production direction is stronger identity correlation through OIDC, proxy-auth, or a comparable authenticated trust boundary, while keeping BYOK authority in `gateway-api`

## Recommended Execution Order

1. Create root workspace configuration.
2. Create foundational product and architecture documentation.
3. Create minimal shared packages.
4. Create minimal apps.
5. Create local infrastructure files.
6. Add CI-ready scripts and placeholders.

## Phase 2 Entry State

Phase 1 now ends with:

- authenticated admin and user control-plane flows
- encrypted provider credential management
- gateway request execution and streaming through the provider seam
- a role-aware SPA with mobile and desktop behavior
- feature-oriented UI modules with strong unit and component coverage
- CI enforcement for typecheck, build, and test

Phase 2 should build on this state rather than re-open foundational architecture decisions.

The current Phase 2 seam expansion already includes image generation and image editing, with provider-owned model metadata available for UI constraints such as aspect ratio selection, output format, transparency/background handling, input fidelity, and compression controls.

The current implementation now also includes:

- a canonical image provider catalog contract returned by `gateway-api`
- gateway-managed image asset upload for mobile-safe reference workflows
- persisted image job history with pagination at 10 jobs per page
- save and reuse flows for generated images through gateway-managed assets
- a consistent provider-internal image pattern across NanoGPT, OpenAI, xAI, Google, and OpenRouter: catalog, model policy, transport client, request mapper, response mapper, and generation/edit services where implemented
- OpenRouter image generation and image editing behind the same seam, using OpenRouter chat completions plus image-specific catalog and request mapping inside `provider-openrouter`
- provider-specific image work remaining behind `packages/provider-sdk`, not in `gateway-api`
- a first OpenAI-compatible integration path for Open WebUI through `GET /api/v1/openai/models` and `POST /api/v1/openai/chat/completions`
- trusted internal caller support that can correlate Open WebUI requests to existing gateway users by forwarded email header when explicitly configured

That provider-internal image pattern is now the expected reference for any new image-capable provider added behind `packages/provider-sdk`.
