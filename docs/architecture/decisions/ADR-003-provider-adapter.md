# ADR-003: Provider Adapter Seam

## Status

Accepted

## Decision

Provider integrations are implemented behind a shared adapter seam in `packages/provider-sdk`.

`gateway-api` depends on the seam, not on a concrete provider package.

The seam is capability-oriented.

Chat, model catalog listing, image generation, and image editing are separate provider capabilities behind the same boundary.

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
- image-specific provider details such as xAI's `/v1/images/generations` and `/v1/images/edits` endpoints, Google's native Gemini `generateContent` image flow, or OpenAI's `/v1/images/generations` plus its currently inconsistent `images/edits` runtime, must remain inside provider packages, not `gateway-api`
- if a provider package fetches remote reference media in order to transform normalized gateway inputs into provider-native payloads, that package must also own SSRF and content-validation controls for that fetch path
- shared validation and fetch-safety logic for normalized image references may live in `provider-sdk`, but concrete adapters remain responsible for deciding when to use it and how to map the resulting data into provider-native payloads
- model-catalog metadata needed by capability-specific UI flows, such as supported image aspect ratios, response formats, resolutions, output formats, background modes, quality presets, input fidelity, compression ranges, and request limits, should also remain provider-owned and flow through normalized adapter results
- provider packages may truthfully expose a narrower runtime capability set than a provider's marketing or documentation suggests when the live upstream API behaves differently; that truth should flow through model capabilities and UI affordances instead of being hidden behind optimistic gateway behavior
