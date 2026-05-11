# ADR-009A: Model Family Capability Layer

## Status

Accepted

## Context

`lxp-llm-gateway` supports both direct providers and aggregator providers.

Direct providers expose their own model APIs directly, such as OpenAI, Anthropic, Google Gemini, xAI, Kling, Mistral, DeepSeek, or z.AI.

Aggregator providers expose models from multiple underlying model families through a shared upstream API surface. Examples include OpenRouter, NanoGPT, Ollama, and potentially other future aggregators.

This creates overlap:

- the same model family may appear through multiple providers
- the same model capability rules may need to apply regardless of transport
- video models such as Kling may appear through OpenRouter, NanoGPT, and native Kling
- image families such as Flux, Seedream, Nano Banana, GLM, or GPT Image may appear through more than one surface
- chat families such as Claude, Gemini, Llama, Qwen, DeepSeek, Mistral, or GPT may have family-specific behavior even when routed through an aggregator

Without a shared model-family capability layer, each provider adapter risks duplicating:

- model-family detection
- capability metadata
- supported modes
- validation rules
- parameter constraints
- UI metadata
- default values
- passthrough options
- provider-specific quirks

This would make the gateway harder to maintain as more providers and model families are added.

## Decision

Introduce a reusable `model-family-capability-layer`.

The layer represents model-family behavior independently from transport provider behavior.

A provider adapter answers:

> How do I communicate with this upstream provider?

A model-family capability profile answers:

> What does this model family support, and how should requests be validated, normalized, and represented?

Initial concrete implementations under this ADR are:

- OpenRouter video transport consuming `kling-video-family`
- NanoGPT video transport consuming `kling-video-family`

The model-family layer must support all current and future modalities:

- chat
- image
- video
- audio
- speech-to-text
- text-to-speech
- moderation
- embeddings
- batch operations
- future multimodal workflows

The first practical use case is video generation, specifically Kling models exposed through OpenRouter, NanoGPT, and eventually native Kling.

The initial family profile is:

- `kling-video-family`

The first reusable concepts include:

- family id
- modality
- supported generation modes
- supported inputs
- supported outputs
- parameter schema
- capability metadata
- normalized validation rules
- provider passthrough rules
- UI field hints
- default values
- unsupported feature reasons

Transport providers may reference model-family profiles when listing models or validating requests.

Provider adapters must not inherit transport behavior from model-family profiles.

Model-family profiles are pure domain/capability definitions. They do not perform HTTP calls and do not depend on provider-specific clients.

## Rationale

Aggregator providers create natural overlap between model families.

For example, a Kling video model routed through OpenRouter and a Kling video model routed through NanoGPT may share the same conceptual capabilities:

- text-to-video
- image-to-video
- multi-image-to-video
- first-frame / last-frame support
- duration constraints
- aspect ratio constraints
- resolution constraints
- optional audio generation
- future lip-sync or video extension capabilities

The transport API may differ, but the family behavior remains related.

A model-family capability layer prevents the gateway from duplicating those rules across every transport adapter.

It also gives the frontend a more stable way to render dynamic controls.

Instead of hardcoding UI behavior per provider, the UI can consume normalized capability metadata:

- which modes are supported
- which fields are required
- which fields are optional
- which values are allowed
- which advanced options are available
- which options are provider-specific passthroughs

This keeps `gateway-api` orchestration clean and avoids leaking provider-specific branching into the application layer.

## Consequences

`packages/provider-sdk`, `packages/domain`, and/or `packages/contracts` must gain explicit model-family capability contracts.

A narrow package may be introduced if needed, for example:

- `packages/model-family-capabilities`

This package must remain focused. It must not become a generic `core` package.

Initial implementation choice:

- serializable model-family metadata is exposed through `@lxp/domain` and `@lxp/contracts`
- reusable family detection, normalization, and validation logic lives in `@lxp/model-family-capabilities`
- transport adapters import family profiles, but application services only consume neutral metadata and validation results

Provider adapters may import family profiles to:

- classify listed models
- enrich model metadata
- validate normalized requests
- map known family options
- expose UI capability descriptors

The gateway may use family metadata to:

- enforce model access rules
- enforce tenant policy limits
- generate cost previews
- render capability-aware UI
- write normalized usage ledger entries
- prevent unsupported requests before calling the upstream provider

The frontend may use family metadata to:

- show only valid controls
- hide unsupported options
- display model-specific constraints
- explain unavailable modes
- avoid provider-specific UI branching

The layer must support family-specific behavior without creating tight coupling between unrelated providers.

## Initial Scope

The initial implementation should focus on video generation.

The first family profile is:

- `kling-video-family`

It should describe:

- text-to-video
- image-to-video
- multi-image-to-video
- video extension
- lip-sync
- supported frame image concepts
- supported duration ranges
- supported aspect ratios
- supported resolutions
- optional audio generation
- provider passthrough rules
- unsupported feature reasons

OpenRouter video should consume this profile when a listed model is identified as a Kling model.

NanoGPT video should later consume the same profile when a listed model is identified as a Kling model.

Native Kling should eventually consume the same profile while providing its own transport adapter.

## Non-Goals

This ADR does not require:

- refactoring every existing provider immediately
- creating a full ontology of every model family now
- moving provider transport logic into model-family profiles
- making OpenRouter or NanoGPT inherit from native providers
- replacing provider-specific adapters
- blocking video implementation until every family is modeled
- adding a generic `@lxp/core` package

## Design Rule

Transport providers own upstream communication.

Model-family profiles own reusable capability semantics.

Application services own tenancy, policy, persistence, storage, history, and ledger.

No layer should absorb the responsibilities of the others.

## Example

A Kling model exposed through OpenRouter should be represented as:

- transport provider: `openrouter`
- model id: provider-specific model slug
- model family: `kling`
- modality: `video`
- family profile: `kling-video-family`
- transport adapter: `provider-openrouter`
- family capability profile: shared Kling video rules

A Kling model exposed through NanoGPT should be represented as:

- transport provider: `nanogpt`
- model id: provider-specific model slug
- model family: `kling`
- modality: `video`
- family profile: `kling-video-family`
- transport adapter: `provider-nanogpt`
- family capability profile: shared Kling video rules

The same family profile may be reused, but each transport adapter remains independent.
```
