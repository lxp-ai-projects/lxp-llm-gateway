# Model Family Capability Layer

## Intent

The model family capability layer separates reusable model-family semantics from provider transport code.

Use this split consistently:

- transport provider adapters own upstream HTTP behavior
- model family profiles own reusable capability semantics
- gateway application services own tenancy, policy, persistence, storage, history, and ledger

## Why OpenRouter Must Not Inherit From Kling

OpenRouter, NanoGPT, and future aggregators expose overlapping model families, but they are still independent transports.

For Kling-family video models:

- `provider-openrouter` owns OpenRouter request/response mapping
- `provider-nanogpt` owns NanoGPT request/response mapping
- a future native Kling adapter would own Kling-native transport
- `@lxp/model-family-capabilities` owns shared Kling capability semantics

That means the adapters may all reference `kling-video-family`, but none of them inherit transport behavior from one another.

## Package Placement

The current implementation uses:

- `@lxp/domain` for serializable family metadata types
- `@lxp/contracts` for frontend-facing transport contracts that include those metadata shapes
- `@lxp/model-family-capabilities` for reusable detection, normalization, validation, and profile definitions

This keeps the shared types neutral while avoiding a catch-all `core` package.

## Aggregator Pattern

Aggregator providers should follow this sequence:

1. list provider-native models
2. detect whether a model belongs to a known family
3. attach normalized family metadata
4. preserve transport-native model ids, pricing, and provider-specific fields

The provider adapter stays transport-focused. The family profile stays reusable.

## Future Reuse

The same pattern can later support:

- image families such as Flux, Seedream, Nano Banana, or GPT Image
- chat families such as Claude, Gemini, Llama, or Qwen
- audio and speech families
- embeddings and moderation profiles

The rule stays the same: normalize family semantics once, then let multiple transports consume them.
