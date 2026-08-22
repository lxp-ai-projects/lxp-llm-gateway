# ADR-014: Route reasoning controls by model family

## Status

Accepted

## Context

Aggregator transports expose native model families without becoming the owner of
those families. A Claude model remains a Claude model when it is reached through
NanoGPT or OpenRouter. The previous implementation associated reasoning controls
with the transport and only recognized GLM models, which caused supported options
to be dropped silently for other families.

OpenRouter documents one normalized `reasoning` request object across Anthropic,
OpenAI, xAI, and other reasoning models. NanoGPT documents `reasoning.effort` and
`reasoning.exclude` for Chat Completions, while its Anthropic-style `thinking`
budget belongs to the Messages endpoint. These transports are similar but not
interchangeable.

## Decision

- Detect `anthropic-claude`, `openai-reasoning`, `xai-grok`, and `zai-glm` from
  `modelId` independently of `providerId`.
- Keep an explicit model-family by transport compatibility table in `domain`.
- Resolve family-owned options in `model-family-capabilities`, then let each
  provider adapter serialize only its verified transport shape.
- Preserve the existing NanoGPT GLM `thinking` mapping.
- Reject mismatched, ambiguous, or undocumented option mappings before the HTTP
  request. In particular, reject exact Claude budgets on NanoGPT Chat Completions
  rather than approximating them as an effort level.
- Normalize aggregator HTTP errors behind `provider-sdk` and expose safe request,
  code, type, and upstream-provider metadata through Gateway 502 responses.
- Mark aggregator preflight token counting as unavailable. Post-response usage is
  identified separately as provider-reported and is not presented as a preflight
  tokenizer result.

## Consequences

- `gateway-api` remains unaware of NanoGPT or OpenRouter request formats.
- Existing callers using NanoGPT GLM options or OpenRouter `reasoning` remain
  compatible.
- New model families can be added only with detection, a compatibility entry,
  mapping tests, and provider evidence.
- Native OpenAI and xAI mappings are deliberately absent from the compatibility
  table until their adapters consume the new shared family options.
- Documentation and unit tests verify the current request shapes. Live provider
  integration validation remains required because no provider credentials were
  available during this change.

## Evidence

- [OpenRouter reasoning tokens](https://openrouter.ai/docs/guides/best-practices/reasoning-tokens)
- [NanoGPT extended thinking](https://docs.nano-gpt.com/api-reference/miscellaneous/extended-thinking)
