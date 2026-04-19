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
- the same gateway contract now drives NanoGPT, OpenRouter, Ollama, Groq, xAI Grok, OpenAI, and Anthropic Claude without `gateway-api` branching on provider-specific transport details
- image-specific provider details such as xAI's `/v1/images/generations` and `/v1/images/edits` endpoints must remain inside provider packages, not `gateway-api`
