STOP implementation temporarily.

The current hardening pass is incorrectly treating provider model-discovery
metadata as the sole authority for reasoning capability.

That is NOT the architecture requested.

The original task explicitly provided official documentation for every
supported provider and instructed:

    DO NOT INVENT CAPABILITIES.
    WHEN IN DOUBT, USE OFFICIAL DOCUMENTATION.

You must now perform a documentation-backed capability audit BEFORE making
further implementation changes.

==================================================
CORE CORRECTION
==================================================

There are THREE distinct evidence sources:

1. Native provider runtime model discovery
   -> tells us model availability / identity
   -> it may or may not expose capabilities

2. Official native provider documentation
   -> authoritative source for documented model-specific reasoning semantics

3. Aggregator/runtime model metadata
   -> authoritative evidence for what THAT ROUTE exposes

Absence of capability metadata from a native `/models` endpoint does NOT
mean the capability is unsupported when official provider documentation
explicitly documents it.

Likewise, official native capability does NOT automatically prove that an
aggregator route exposes the same control.

==================================================
BEFORE CODING: PRODUCE THE EVIDENCE MATRIX
==================================================

For EVERY currently supported chat provider/model that may support
reasoning/thinking, build a reviewed evidence matrix.

Do not modify capability code until this matrix is complete enough to review.

Columns:

- Provider
- Exact model ID
- Model display name
- Official documentation URL
- Reasoning/thinking supported?
- Thinking mode(s)
- Default thinking state
- Can thinking be disabled?
- Conditions where thinking is mandatory
- Supported effort levels
- Default effort
- Budget-token support
- Reasoning-output visibility control
- Reasoning response representation
- Multi-turn/tool replay requirement
- Runtime `/models` exposes capability metadata?
- Notes / model-specific restrictions
- Evidence status:
  DOCUMENTED
  RUNTIME_METADATA
  DOCUMENTED + RUNTIME
  UNKNOWN

UNKNOWN means:
do not expose the capability.

It does NOT mean:
assume false when official documentation has not yet been checked.

==================================================
USE THE PROVIDED OFFICIAL SOURCES
==================================================

You were explicitly given these references. Read them.

Anthropic:
- https://platform.claude.com/docs/en/build-with-claude/effort
- https://platform.claude.com/docs/en/build-with-claude/thinking

DeepSeek:
- https://api-docs.deepseek.com/guides/thinking_mode

Google:
- https://ai.google.dev/gemini-api/docs/thinking
- thought signatures section

Groq:
- https://console.groq.com/docs/reasoning

Moonshot/Kimi:
- https://platform.kimi.ai/docs/guide/use-thinking-models
- https://platform.kimi.ai/docs/guide/use-reasoning-effort

Mistral:
- official Chat API / reasoning documentation

OpenAI:
- https://developers.openai.com/api/docs/guides/text
- https://developers.openai.com/api/docs/guides/reasoning

xAI:
- https://docs.x.ai/developers/model-capabilities/text/reasoning

Z.AI:
- https://docs.z.ai/guides/capabilities/thinking-mode
- https://docs.z.ai/guides/capabilities/thinking

Ollama:
- https://docs.ollama.com/capabilities/thinking
- https://ollama.com/search?c=thinking

OpenRouter:
- https://openrouter.ai/docs/guides/best-practices/reasoning-tokens

NanoGPT:
- https://docs.nano-gpt.com/api-reference/endpoint/models

==================================================
ANTHROPIC IS THE FIRST GOLDEN TEST
==================================================

Fix Anthropic FIRST before continuing with another provider.

For example, official Anthropic documentation currently establishes for
Claude Opus 5:

- thinking is ON by default;
- thinking and effort are distinct controls;
- supported effort levels:
  low
  medium
  high
  xhigh
  max
- default effort:
  high
- thinking may be disabled at high or below;
- thinking CANNOT be disabled at xhigh or max;
- xhigh/max + thinking disabled is invalid;
- adaptive/default thinking behavior must not be represented as legacy
  extended-thinking budget controls.

Therefore the current UI state:

    "Extended thinking: none"

as the primary representation for Claude Opus 5 is semantically wrong.

Fix the normalized capability before fixing the UI.

The UI must derive from the normalized capability.

Do not add an Anthropic-specific UI workaround.

==================================================
OPENAI IS THE SECOND GOLDEN TEST
==================================================

Do not conclude:

    GET /models did not expose reasoning metadata
        -> reasoning unsupported

OpenAI official reasoning documentation is capability evidence.

Runtime model discovery and capability semantics are separate concerns.

A reviewed OpenAI native capability registry must encode the supported
reasoning controls documented for the exact supported model.

Unknown future OpenAI model:
-> UNKNOWN / unsupported until reviewed

Known documented model:
-> use the documented capability even if GET /models is sparse

OPENAI — IMPORTANT MODEL-SPECIFIC RULE

OpenAI's model discovery API does not expose a complete reasoning-capability
description.

This means:

    absence of a reasoning field in GET /models
        != reasoning unsupported

but ALSO:

    provider == OpenAI
        != reasoning supported

Reasoning support MUST be resolved per exact supported model from official
OpenAI documentation encoded in the reviewed native capability registry.

For every OpenAI model:

1. Exact model has reviewed official documentation proving reasoning support
   -> expose ONLY the documented reasoning capability and exact supported
   effort levels/defaults.

2. Exact model is documented as non-reasoning
   -> reasoning is unsupported.

3. Exact model has no reviewed capability entry / cannot be mapped reliably
   -> reasoning is UNKNOWN and Gateway must not expose reasoning controls.

DO NOT infer reasoning from:
- provider=OpenAI;
- model name beginning with "gpt";
- model generation/family;
- another OpenAI model's capability;
- the presence or absence of fields in GET /models alone.

Examples must come from the current official documentation, not assumptions.

The native capability registry therefore acts as:

    exact OpenAI model identity
        -> documented model-specific capability

NOT:

    OpenAI provider
        -> generic reasoning capability

Add regression tests proving all three cases:

A. documented reasoning-capable OpenAI model
-> correct exact capability

B. documented non-reasoning OpenAI model
-> reasoning unsupported

C. unknown/unreviewed OpenAI model
-> reasoning unsupported/unknown
-> no reasoning UI controls

Also prove that sparse GET /models metadata does not erase an existing
documented capability for case A.

==================================================
AGGREGATORS
==================================================

OpenRouter:

Use its per-model runtime `reasoning` metadata, including fields such as:

    supported_efforts
    default_effort
    default_enabled
    mandatory

This metadata describes the OpenRouter ROUTE.

NanoGPT:

Use detailed model metadata.

`capabilities.reasoning === true`
means NanoGPT exposes reasoning for that model route.

But that boolean alone does NOT establish every native model semantic such
as exact effort levels, mandatory reasoning, or replay rules.

If exact native identity is proven:
aggregator route capability
INTERSECT
documented native semantics

If identity is not proven:
do not invent the missing native semantics.

Ollama:

Use documented/runtime model capabilities.
Do not infer from model-name substrings.
Model-specific controls such as GPT-OSS must remain model-specific.

==================================================
NO MORE PROVIDER-WIDE FLATTENING
==================================================

Forbidden:

    Anthropic supports thinking
        -> every Claude model gets same control

    OpenAI /models has no reasoning field
        -> no OpenAI model gets reasoning

    NanoGPT reasoning=true
        -> automatically inherit every native effort level

    model name contains "reasoning"
        -> reasoning=true

Capabilities are:

    MODEL + ROUTE specific.

==================================================
IMPLEMENTATION ONLY AFTER MATRIX REVIEW
==================================================

Once the evidence matrix is produced:

1. show the matrix;
2. identify discrepancies with current code;
3. identify which existing capability entries were invented or over-generalized;
4. identify documented capabilities currently missing;
5. then update the canonical registry/resolver;
6. then update provider wire mappings;
7. then update UI from normalized metadata;
8. then add regression tests.

Do not continue patching the UI model-by-model before the normalized
capability layer is correct.

Primary invariant:

    Documentation establishes native model semantics.
    Runtime metadata establishes route semantics.
    Exact identity mapping connects them.
    The Gateway never guesses.
