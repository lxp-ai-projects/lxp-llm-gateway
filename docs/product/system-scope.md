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
- foundational documentation and API contract placeholders
- incremental UI refactor work that keeps `admin-web` maintainable as feature depth increases
- Phase 2 provider-seam expansion for image generation capabilities

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
- `admin-web` as a role-aware SPA with public auth surfaces, user self-service, admin management, and a local chat test surface
- Postgres-backed durable control-plane persistence with encrypted provider credential storage
- Redis-backed auth revocation and other operational state where ephemeral behavior is appropriate
- BYOK provider access through user-managed provider credentials
- provider model discovery through provider adapters, including capability-specific model metadata
- working provider integrations for NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude behind `packages/provider-sdk`
- frontend feature modules under `src/features/*`
- CI quality gates for typecheck, test, and build
- an initial `Image Generation Lab` in `admin-web` backed by gateway image-generation and image-editing endpoints

## Phase 2 Starting Assumptions

Phase 2 should assume:

- the provider seam is already the canonical integration boundary
- cookie-only browser auth is the expected SPA posture
- the SPA codebase is already organized by feature and can continue to evolve incrementally
- CI quality gates already cover typecheck, test, and build
- new provider capabilities should extend `packages/provider-sdk`, not bypass it
- image history, save state, and gateway-managed reference assets belong in the application layer, not in provider packages
- image-provider packages should stay thin at the adapter boundary and split image concerns into provider catalog, model policy, transport client, request mapper, response mapper, and generation/edit services

The next planned capability expansion is:

- broader provider coverage for image generation and image editing behind the existing provider seam
- provider-owned capability metadata such as supported aspect ratios, response formats, resolutions, output formats, background modes, quality presets, input fidelity, compression ranges, and request limits flowing from model catalogs to the UI
- future providers beyond the current xAI, Google, and OpenAI image implementations behind the same seam
- reference-image workflows that keep uploaded image handling and provider dispatch behind application APIs
- paginated image job history and reusable saved/generated assets for operators

Current image-provider posture is:

- `NanoGPT` image models are exposed for generation and editing, with provider-owned capability metadata and paid-model distinctions flowing through the catalog
- `xAI Grok` image models are exposed for generation and editing
- `Google Gemini` image models are exposed for generation and editing
- `OpenAI GPT Image` is exposed for generation and editing through the same seam, with provider-owned capability metadata controlling the UI affordances
- `OpenRouter` is exposed for image generation and image editing through the same seam, with reused capability metadata where the underlying model family already exists in another provider package

Phase 2 should not spend time re-litigating those foundation choices unless a concrete failure mode appears.
