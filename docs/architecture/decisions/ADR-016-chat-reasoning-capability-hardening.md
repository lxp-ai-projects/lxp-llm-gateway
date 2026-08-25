# ADR-016: Harden chat reasoning as a model-on-route capability

## Status

Accepted

## Context and audit

The first reasoning pass had competing sources of truth: provider-specific
request objects, broad model-name regular expressions, a transport table derived
from those expressions, uneven provider metadata, and duplicate Chat Lab replay
logic. Anthropic and Z.AI already had working provider mappings. NanoGPT already
requested detailed data, OpenRouter parsed part of its reasoning object, and
Ollama already enriched tags through `/api/show`.

The main regression risks were invented aggregator parity, OpenRouter null
efforts expanding to every effort, Ollama treating every thinking model as a
boolean, and UI behavior diverging from catalog metadata. DeepSeek, Gemini,
Groq, Kimi, Mistral, OpenAI, and xAI lacked one reviewed capability source and
canonical request validation.

## Decision

`Model capability` is not `provider capability`.

Effective capability is reviewed model semantics intersected with documented or
discovered route semantics. Exact native entries are the source for native
routes. NanoGPT, OpenRouter, and Ollama runtime metadata is the source for those
routes. Aggregators do not inherit native semantics without an exact reviewed
identity mapping.

The public request uses one canonical object:

```ts
reasoning?: {
  enabled?: boolean;
  effort?: 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  budgetTokens?: number;
  includeOutput?: boolean;
}
```

Disabling compute differs from excluding output. Validation occurs before
dispatch. Mandatory reasoning cannot be disabled, unsupported efforts are not
downgraded, and unknown models reject controls. Legacy `providerOptions` remain
readable migration inputs, not capability truth.

Normalized capability fields are included only when proven: support, toggle,
budget and output-exclusion controls, efforts/defaults, mandatory state, output
kind, replay requirement, semantic meaning, and provenance.

**NEVER ADD A REASONING MODEL OR CAPABILITY WITHOUT EVIDENCE.**

## Reviewed native matrix

Reviewed on 2026-08-24 from the official URL stored with each registry entry.

| Provider | Exact reviewed IDs                                                                | Controls                                             |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| DeepSeek | `deepseek-v4-flash`, `deepseek-v4-pro`                                            | toggle and documented effort mapping                 |
| Google   | exact Gemini IDs in the official thinking table                                   | per-model efforts/defaults                           |
| Groq     | `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.6-27b`                   | GPT-OSS effort; Qwen toggle                          |
| Moonshot | `kimi-k3`, `kimi-k2.7-code`, `kimi-k2.7-code-highspeed`, `kimi-k2.6`, `kimi-k2.5` | distinct mandatory, effort, toggle, replay semantics |
| Mistral  | `mistral-small-latest`, `mistral-medium-3-5`                                      | documented effort only                               |
| xAI      | `grok-4.6`, `grok-4.5`                                                            | mandatory reasoning-depth effort                     |
| Z.AI     | `glm-5.3`, `glm-5.2`, `glm-5.1`, `glm-5`, `glm-4.7`, `glm-4.6`                    | forced or toggle semantics                           |

Anthropic and OpenAI facts not represented by exact entries remain
runtime-derived or unknown. No provider-wide claim substitutes for missing
exact evidence.

## Runtime route matrix

| Route      | Evidence                                              | Conservative behavior                                                      |
| ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------- |
| NanoGPT    | `GET /models?detailed=true`, `capabilities.reasoning` | false/missing means no support; no suffix is constructed                   |
| OpenRouter | per-model `reasoning` metadata                        | null/missing efforts remain absent; mandatory/budget are metadata-driven   |
| Ollama     | `/api/tags` plus bounded `/api/show`                  | missing detail remains unknown; exact GPT-OSS IDs use level-valued `think` |

No new native-to-aggregator semantic identity mapping is asserted. Plausible
aliases, future GLM/Claude/Grok/GPT names, NanoGPT thinking suffixes, Ollama
Nemotron variants, and xAI multi-agent models are **NOT ENABLED - insufficient
evidence** for canonical equivalence.

## Consequences

Chat Lab renders controls and replay from normalized metadata. Provider adapters
own wire translation behind `provider-sdk`. Visible reasoning content and opaque
reasoning details remain separate. Image and video capability hardening remains
a separate follow-up.
