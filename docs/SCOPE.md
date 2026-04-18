# lxp-llm-gateway Scope

## Purpose

`lxp-llm-gateway` is a new monorepo for a multi-provider LLM gateway platform.

The goal is to start from a clean architecture instead of carrying forward the structural debt of the previous proxy implementation.

The repository must provide:

- a gateway API for LLM traffic
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
- a minimal `gateway-api`
- a minimal `admin-api`
- a minimal `admin-web`
- a minimal provider abstraction layer
- working provider implementations for:
  - `NanoGPT`
  - `OpenRouter`
  - `Ollama`
- local development infrastructure with Redis or Valkey
- an initial OpenAPI placeholder
- basic CI-ready scripts for lint, build, and test
- incremental UI hardening and refactor work that preserves behavior while improving maintainability, testability, and mobile operability

Phase 1 does not include:

- a broad provider marketplace beyond `NanoGPT`, `OpenRouter`, and `Ollama`
- quota engines
- policy engines
- analytics
- a complex admin dashboard
- speculative workers or event subsystems

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

Database persistence is intentionally deferred. Redis or Valkey is acceptable for the first phase.

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

Phase 1 frontend code should remain decomposable.

Large multi-concern React files may exist temporarily during delivery, but they are not the target architecture.

When the UI surface grows, refactor toward:

- focused feature modules
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
- provider access configuration that can represent:
  - bearer-token providers such as `NanoGPT` and `OpenRouter`
  - endpoint-based providers such as `Ollama`

### Provider Packages

Concrete provider implementations currently shipped in Phase 1:

- `packages/provider-nanogpt`
- `packages/provider-openrouter`
- `packages/provider-ollama`

Each package owns:

- request and response mapping
- streaming adaptation
- provider-specific integration logic

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

## Initial Provider Adapter Shape

```ts
export interface LlmProviderAdapter {
  readonly providerId: string;

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
- make a second provider possible later
- keep the gateway application clean

## Persistence Strategy

Phase 1 may use Redis or Valkey for:

- sessions
- refresh token support
- simple configuration state
- temporary credential storage if required

This must be documented as a short-term simplification.

Long-term source-of-truth persistence will likely move to Postgres when audit, quota, metadata, or workflow requirements grow.

## Security Constraints

These rules apply from the scaffold stage:

- do not store JWTs in `localStorage`
- prefer `HttpOnly` cookie-based admin auth or an equally defensible approach
- do not rely long-term on weak gateway authentication conventions
- encrypt provider credentials at rest
- keep caller identity, user identity, and provider credentials clearly separated

The implementation may begin simply, but the boundaries must be sound from the beginning.

## Recommended Execution Order

1. Create root workspace configuration.
2. Create foundational product and architecture documentation.
3. Create minimal shared packages.
4. Create minimal apps.
5. Create local infrastructure files.
6. Add CI-ready scripts and placeholders.

## Immediate Next Step

The next implementation step is to scaffold the repository structure and documentation foundation without introducing full business logic.
