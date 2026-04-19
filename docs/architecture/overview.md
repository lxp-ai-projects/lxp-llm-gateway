# Architecture Overview

## System Context

The platform separates the data plane from the control plane.

- `admin-web` talks to `admin-api`
- `admin-web` talks to `gateway-api` for chat and model discovery
- clients or trusted internal callers talk to `gateway-api`
- `gateway-api` talks to provider adapters through `provider-sdk`
- `provider-nanogpt`, `provider-openrouter`, `provider-ollama`, `provider-groq`, `provider-google`, `provider-xai`, `provider-openai`, and `provider-anthropic` are concrete provider implementations behind the same seam

## Boundary Rules

### Data Plane

`gateway-api` handles:

- request intake
- caller authentication from cookie or bearer access token
- identity resolution from `emailHash`
- provider credential resolution
- provider dispatch
- model listing
- streaming passthrough
- normalized non-stream response delivery

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

## Persistence Posture

The current architecture uses relational persistence for:

- users
- roles
- provider credentials

Postgres is the durable source of truth for control-plane identity and encrypted provider secrets.

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
- short-lived access tokens with server-side revocation support
- gateway-side identity resolution from `emailHash`, not a caller-supplied internal user id
- generalized error handling that avoids overexposing account and token state to callers
- write-only or masked-only handling for provider secrets in administrative workflows

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
- `Google Gemini` to use bearer-token auth through Google's OpenAI-compatible Gemini API
- `xAI Grok` to use bearer-token auth through an OpenAI-compatible endpoint
- `OpenAI` to use bearer-token auth through the OpenAI chat completions and models endpoints
- `Anthropic Claude` to use `x-api-key` auth plus Anthropic-specific message and model endpoints
- `Ollama` to use either a local/runtime endpoint or Ollama Cloud with bearer auth

`gateway-api` resolves and decrypts provider access data, but it does not interpret provider-specific transport rules.
