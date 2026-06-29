# ADR-003: Provider Adapter Seam

## Status

Accepted

## Decision

Provider integrations are implemented behind a shared adapter seam in `packages/provider-sdk`.

`gateway-api` depends on the seam, not on a concrete provider package.

The seam is capability-oriented.

Chat, model catalog listing, image provider catalog listing, image generation, and image editing are separate provider capabilities behind the same boundary.

## Current Implementation Note

The current runtime composition in `apps/gateway-api` still imports concrete provider packages in its Nest module composition root in order to instantiate and register adapters.

This means the current implementation preserves the seam in application services and registry usage, but not yet in the strictest possible dependency-reading of the gateway boundary.

Factually:

- `gateway-api` service-layer orchestration resolves providers through `LlmProviderAdapter`
- `gateway-api` registry code stores and returns `LlmProviderAdapter`
- `gateway-api` module composition still imports concrete adapters such as `@lxp/provider-nanogpt` and `@lxp/provider-openai`

This is acceptable for now as a composition-root choice, but it should remain an explicit architecture review point rather than an unnoticed default.

Future evaluation question:

- should concrete provider registration remain in `gateway-api` composition, or move to a dedicated provider-runtime assembly layer so the gateway depends only on `provider-sdk` even at composition time?

## Rationale

- provider-specific logic must not leak into the gateway application
- additional providers should be addable without redesigning the gateway
- additional provider capabilities should be addable without redesigning the gateway
- streaming and normalization behavior need a stable abstraction point

## Consequences

- the adapter contract must remain intentionally small but not chat-exclusive
- provider packages must absorb integration-specific complexity
- the provider execution context may carry generalized access configuration such as `baseUrl` and auth headers, not only a raw API key
- the same gateway contract now drives NanoGPT, OpenRouter, Ollama, Groq, Google Gemini, xAI Grok, OpenAI, and Anthropic Claude without `gateway-api` branching on provider-specific transport details
- the seam now also carries provider-owned image catalogs for UI and application orchestration without moving provider-specific image rules into `gateway-api`
- image-specific provider details such as xAI's `/v1/images/generations` and `/v1/images/edits` endpoints, Google's native Gemini `generateContent` image flow, OpenAI's images endpoints, or OpenRouter's `/chat/completions` image path, must remain inside provider packages, not `gateway-api`
- if a provider package fetches remote reference media in order to transform normalized gateway inputs into provider-native payloads, that package must also own SSRF and content-validation controls for that fetch path
- shared validation and fetch-safety logic for normalized image references may live in `provider-sdk`, but concrete adapters remain responsible for deciding when to use it and how to map the resulting data into provider-native payloads
- model-catalog metadata needed by capability-specific UI flows, such as supported image aspect ratios, response formats, resolutions, output formats, background modes, quality presets, input fidelity, compression ranges, lifecycle state, and request limits, should also remain provider-owned and flow through normalized adapter results
- application concerns such as asset persistence, save state, history pagination, and resolution of gateway-managed asset references are explicitly outside provider packages and belong in the gateway application layer
- within a provider package, the preferred image-workflow decomposition is: provider catalog/registry, model policy, transport client, request mapper, response mapper, and generation/edit services, with the exported adapter remaining a composition/orchestration layer only

### Image Provider Reference Pattern

For image-capable providers, the reference implementation shape is now:

- `src/index.ts` as a composition root only
- `src/image/catalog.ts` for static model descriptors, labels, lifecycle state, and defaults
- shared `provider-sdk` image contracts and image-reference utilities for normalized requests, responses, catalogs, and safe reference resolution
- `src/image/model-policy.ts` for capability checks and request validation
- `src/image/request-mapper.ts` for canonical request to provider payload mapping
- `src/image/api-client.ts` for raw upstream HTTP transport only
- `src/image/response-mapper.ts` for provider payload to canonical response mapping
- `src/image/generation-service.ts` for generation orchestration
- `src/image/edit-service.ts` for edit orchestration

This pattern is the expected template for future image providers because it keeps model evolution mostly declarative and prevents request normalization, endpoint selection, HTTP transport, and response parsing from collapsing into one mixed-responsibility class.
