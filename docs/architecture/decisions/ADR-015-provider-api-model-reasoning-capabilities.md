# ADR-015: Source Chat Lab reasoning capabilities from provider APIs

## Status

Accepted

## Context

Chat Lab previously decided whether to show reasoning controls from provider IDs
and model-name patterns. This mislabeled Claude and OpenAI routes through
NanoGPT as "GLM thinking" and treated an unknown model as unsupported.

Provider model APIs do not expose a uniform capability schema. Anthropic now
publishes thinking capabilities, NanoGPT offers detailed capability flags,
OpenRouter publishes effective reasoning parameters, and Ollama exposes local
model capabilities through its show endpoint. OpenAI's Models API still returns
only basic model identity and ownership information.

## Decision

- Add a normalized, provider-API-sourced reasoning capability to model catalog
  entries, including supported controls, efforts, defaults, mandatory status,
  source provider, and source model ID.
- Treat a native provider capability as the authority for that native route.
- Treat an aggregator's per-model capability as the effective capability of that
  aggregator route. It must not be replaced by gateway model-name guesses.
- Preserve three states: declared supported, declared unsupported, and unknown.
- Do not convert an omitted capability into `supported: false`.
- Let Chat Lab render controls and explanatory text from the selected catalog
  entry. Provider-family detection remains only for request mapping and
  preservation compatibility after the catalog has declared support.
- When an aggregator declares reasoning mandatory, do not render a toggle or
  send an enable/disable override; use the provider-declared default.
- Allow OpenRouter's generic `reasoning` transport for catalog-declared models
  whose native family is not yet known to LXP. Family-owned options still
  require a known, compatible family.
- Keep the NanoGPT GLM-specific payload for GLM routes, while using NanoGPT's
  documented generic `reasoning.effort` control for other reasoning families.
- Query Ollama `/api/show` per listed model. A detail failure leaves that model
  unknown instead of failing the complete model list.

## Consequences

- Claude and OpenAI routes through aggregators no longer receive GLM labels.
- New or aliased models can become supported through provider metadata without a
  frontend release.
- Stealth or preview models with mandatory reasoning remain usable without
  speculative family classification.
- Native OpenAI models display an unknown capability until OpenAI adds model
  capability metadata or another authoritative API source is integrated.
- Ollama model discovery performs one additional request per model to obtain
  authoritative capabilities.
- The gateway boundary remains provider-neutral; provider packages own parsing
  of their upstream catalog shapes.

## Evidence

- [Anthropic List Models](https://platform.claude.com/docs/en/api/models/list)
- [NanoGPT Models](https://docs.nano-gpt.com/api-reference/endpoint/models)
- [OpenRouter Models](https://openrouter.ai/docs/guides/overview/models)
- [OpenRouter reasoning options](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- [Ollama Show model details](https://docs.ollama.com/api-reference/show-model-details)
- [OpenAI Models object](https://platform.openai.com/docs/api-reference/models/object)
