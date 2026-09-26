PR — Chat Provider Reasoning / Thinking Capability Hardening

Repository:
lxp-llm-gateway

Create a dedicated provider-hardening PR from the current clean branch.

This is NOT part of PGS PR14 and must not modify PGS evaluation semantics.

==================================================
MISSION
==================================================

The Gateway already contains a first pass of thinking/reasoning support, but
there have been regressions and inconsistent behavior between:

1. native provider adapters;
2. aggregator/provider routes such as NanoGPT;
3. OpenRouter;
4. Ollama.

The goal of this PR is to make CHAT reasoning/thinking capabilities:

- explicit;
- model-specific;
- provider-route-specific;
- evidence-backed;
- normalized through the Gateway;
- regression-tested;
- identical in normalized semantics when the same underlying model is
  available through multiple routes AND equivalence can actually be proven.

IMPORTANT PRINCIPLE:

    Never infer a reasoning capability merely because of:
    - provider name;
    - model-name substring;
    - model size;
    - vendor family resemblance;
    - "-thinking" / ":thinking" suffix guess;
    - another provider's support for a similar model.

If a capability cannot be proven from official provider documentation,
provider model metadata, or an explicit reviewed model mapping:

    DO NOT ASSUME THE CAPABILITY.

Unknown means unsupported / unavailable for Gateway controls until proven.

Do not invent supported models or effort levels.

==================================================
SCOPE
==================================================

IN SCOPE:

- Chat/completion reasoning and thinking capabilities.
- Native providers currently supported by the Gateway:
  - Anthropic
  - DeepSeek
  - Google / Gemini
  - Groq
  - Moonshot / Kimi
  - Mistral
  - OpenAI
  - xAI
  - Z.AI / GLM

- Aggregator/runtime routes:
  - NanoGPT
  - OpenRouter
  - Ollama

- Model capability discovery.
- Canonical reasoning capability representation.
- Canonical reasoning request controls.
- Provider-specific request mapping.
- Provider reasoning response normalization.
- Reasoning state required for safe multi-turn/tool-call replay.
- Admin/Chat Lab UI reasoning controls.
- Native-vs-aggregator capability parity tests.
- Documentation and a reviewed model/capability matrix.

OUT OF SCOPE:

- image generation;
- video generation;
- image understanding capability hardening beyond what is required by
  existing chat behavior;
- PGS evaluation profile changes;
- PGS policy logic;
- provider credential architecture;
- billing;
- retries unrelated to reasoning;
- broad model catalog redesign;
- unrelated UI redesign;
- custom Cyrantis evaluator;
- repository-wide cleanup.

We will perform the same capability-hardening exercise for image/video
providers in a later PR.

Design the capability abstraction so that future modalities can follow the
same principles, but DO NOT implement image/video capability matrices here.

==================================================
0. AUDIT THE CURRENT IMPLEMENTATION FIRST
   ==================================================

Before changing code, perform a focused audit of the current reasoning pass.

Specifically inspect:

- contracts representing chat reasoning/thinking;
- provider-specific `providerOptions`;
- native provider request mapping;
- provider response normalization;
- model capability definitions;
- model discovery/listModels implementations;
- Admin API model metadata;
- Admin Web / Chat Lab reasoning UI;
- model-name heuristics;
- tests covering Anthropic / GLM / aggregators.

A recent repository snapshot contained patterns similar to:

- Anthropic-specific extended thinking options;
- Z.AI-specific thinking options;
- OpenRouter-specific reasoning options;
- Ollama-specific thinking options;
- a domain-level reasoning family detector focused mainly on GLM;
- model-name regex/heuristics;
- aggregator reasoning support inferred from model name;
- NanoGPT/OpenRouter model discovery parsing only id/name and discarding
  useful capability metadata;
- Ollama model listing based primarily on `/api/tags`;
- UI logic detecting reasoning controls from provider/model names.

VERIFY whether these still exist before modifying them.

Do not blindly delete working implementations.

Produce a short audit before coding:

1. current source(s) of truth;
2. duplicate reasoning logic;
3. known regression risks;
4. native providers currently implemented correctly;
5. native providers missing reasoning support;
6. aggregator capability metadata currently ignored;
7. UI heuristics that should be replaced.

Then implement the hardening.

==================================================
1. AUTHORITATIVE SOURCES — NO INVENTED SUPPORT
   ==================================================

Use OFFICIAL provider documentation only for the supported capability matrix.

Re-open the current documentation while implementing; do not treat model
facts embedded in this prompt as permanently current.

Official source manifest:

Anthropic / Claude Platform
- Build with Claude -> Effort
- Build with Claude -> Thinking

DeepSeek API
- Guides -> Thinking Mode

Google AI for Developers / Gemini API
- Thinking
- Thought signatures / multi-turn thinking state

Groq
- Reasoning
- Supported reasoning models
- Per-model reasoning-effort rules

Moonshot / Kimi API Platform
- Thinking Models
- Reasoning Effort

Mistral
- Chat endpoint reasoning_effort
- Reasoning guide
- Model-specific reasoning support

OpenAI Developers
- Text / Responses guidance where applicable
- Reasoning models
- model-specific reasoning effort documentation

xAI
- Model Capabilities -> Text -> Reasoning

Z.AI
- Thinking Mode
- Thinking / model-specific behavior

Ollama
- Capabilities -> Thinking
- Model details `/api/show`
- official thinking-model catalog

NVIDIA Nemotron
- NVIDIA's official Nemotron documentation MAY be supporting evidence,
  but it is NOT sufficient by itself to claim an Ollama route supports
  thinking.

OpenRouter
- Reasoning Tokens
- GET /api/v1/models reasoning metadata

NanoGPT
- GET /api/v1/models
- detailed model capabilities
- Extended Thinking / Reasoning documentation

For each static capability entry we add, record provenance:

- provider;
- exact model ID or explicitly documented model family;
- capability;
- official source;
- date reviewed.

Do not add a model to a static registry because "we know it probably works".

==================================================
2. CREATE ONE CANONICAL CHAT REASONING CAPABILITY MODEL
   ==================================================

The Gateway needs one canonical representation of what a MODEL ON A ROUTE
can actually do.

Do not equate "reasoning supported" with every reasoning feature.

Introduce or extend the existing model capability contract with a concept
equivalent to:

    ChatReasoningCapability

Exact names should follow repository conventions.

Conceptually it needs to express at least:

    supported: boolean

    defaultEnabled?: boolean

    mandatory?: boolean

    supportedEfforts?: [
      minimal,
      low,
      medium,
      high,
      xhigh,
      max
    ]

    defaultEffort?: ...

    supportsToggle?: boolean

    supportsBudgetTokens?: boolean

    supportsOutputExclusion?: boolean

    outputKind?:
      - reasoning-text
      - summary
      - opaque/signed
      - none

    replayRequirement?:
      - none
      - reasoning-content
      - reasoning-details
      - opaque-signature
      - full-assistant-message

    semantic?:
      - reasoning-depth
      - agent-count
      - other-provider-specific-semantic

Fields that cannot be proven should remain absent/unknown.

Do NOT fill unknown fields with guessed defaults.

Avoid redundant fields if one can be safely derived from another.

For example:
- `mandatory=true` implies UI must not offer "Off";
- absence of supportedEfforts means the UI must not invent an effort selector.

Keep this model reasonably small.
Complexity must buy an invariant.

==================================================
3. SEPARATE CAPABILITY FROM REQUEST
   ==================================================

Do not make clients construct provider-specific Anthropic/ZAI/OpenRouter/
Ollama reasoning objects for normal Gateway usage.

Introduce or refine a canonical Gateway chat reasoning request concept.

Conceptually:

    reasoning?: {
        enabled?: boolean;
        effort?: minimal|low|medium|high|xhigh|max;
        budgetTokens?: number;
        includeOutput?: boolean;
    }

Exact naming may follow current contracts.

Important:

- "reasoning disabled" and "hide reasoning output" are DIFFERENT.
- Do not use `exclude=true` as if it disabled compute.
- Do not use effort `none` as the canonical cross-provider representation
  if an explicit `enabled=false` is clearer.
- Provider adapters may translate canonical disabled state to provider
  `none` where that provider requires it.

Validate the canonical request against the selected model's EFFECTIVE
capability before making the network request.

Examples:

- model has no proven reasoning support + reasoning requested
  -> reject locally

- mandatory reasoning model + enabled=false
  -> reject locally

- model supports [low, medium, high] + effort=xhigh
  -> reject locally

- model exposes reasoning but no proven effort controls + effort=high
  -> reject locally

Do not silently downgrade unsupported effort levels.

Do not silently turn reasoning on/off.

A provider-documented mapping is acceptable only when explicitly documented
and tested.

==================================================
4. NATIVE PROVIDER CAPABILITY REGISTRY
   ==================================================

Create one audited source of truth for native-provider reasoning semantics.

Do NOT create multiple independent matrices in:
- provider adapter;
- domain;
- Admin API;
- frontend.

The native registry should contain ONLY models/families supported by official
documentation.

Per provider:

--------------------------------------------------
ANTHROPIC
--------------------------------------------------

Model the distinction between:
- thinking mode;
- effort;
- adaptive thinking;
- legacy budget-based extended thinking;
- mandatory/non-disableable thinking where documented.

Current docs demonstrate that effort level availability differs by model and
that thinking cannot always be disabled.

Do not apply one Claude capability object to every Claude model.

Preserve signed/opaque thinking state needed for multi-turn/tool continuity.
Do not reinterpret an encrypted/signature block as visible reasoning text.

--------------------------------------------------
DEEPSEEK
--------------------------------------------------

Use current official Thinking Mode documentation.

Handle only documented models.

Current docs describe V4 Flash / V4 Pro thinking behavior and documented
reasoning-effort mapping.

If requested effort is mapped by DeepSeek to another actual level, encode
that as an EXPLICIT documented provider mapping and test it.

Do not pretend the requested and actual effort are identical when the
provider documents otherwise.

Preserve `reasoning_content` where required by supported continuation/tool
flows.

--------------------------------------------------
GOOGLE / GEMINI
--------------------------------------------------

Use the official per-model Thinking table.

Do not make provider-wide assumptions.

Normalize only the thinking levels that the selected model explicitly
supports.

Do not interpret "minimal" as "disabled" unless Google documents that exact
semantic for the model.

Preserve thought signatures/opaque state where Google requires replay.

--------------------------------------------------
GROQ
--------------------------------------------------

Use Groq's official Supported Models table.

Reasoning support is MODEL-SPECIFIC.

Do not assume all Groq models support `reasoning_effort`.

Current official documentation has different reasoning controls for
different model families, including GPT-OSS and Qwen.

Represent only the effort values documented for the exact model.

Keep "include reasoning output" separate from "enable reasoning compute".

--------------------------------------------------
MOONSHOT / KIMI
--------------------------------------------------

Model exact documented semantics.

Current documentation differentiates, among others:

- Kimi K3:
  always reasons;
  reasoning effort available;
  documented effort set only;
  cannot be represented as a normal optional toggle.

- Kimi K2.7 Code:
  always thinking;
  no reasoning_effort;
  disabling is invalid.

- Kimi K2.6:
  thinking enabled by default;
  can be disabled;
  preserved-thinking semantics.

- Kimi K2.5:
  documented thinking behavior differs again.

Do NOT flatten these into "Kimi supports thinking=true".

Preserve `reasoning_content` when the documented multi-step/tool flow
requires it.

--------------------------------------------------
MISTRAL
--------------------------------------------------

The Chat API accepts a reasoning_effort vocabulary, but DO NOT conclude that
every Mistral model supports adjustable reasoning.

Use the official reasoning guide to identify supported models.

Current documentation specifically describes adjustable reasoning for
documented Mistral models such as the current Mistral Small / Medium
reasoning-capable variants.

Preserve full ThinkChunk assistant state in multi-turn flows when required.

Do not resurrect deprecated Magistral assumptions unless an explicitly
supported current model requires compatibility.

--------------------------------------------------
OPENAI
--------------------------------------------------

Reasoning effort is model-specific.

Do not create a blanket:
every OpenAI model supports all reasoning efforts

Use the official model/reasoning documentation for each model we support.

Map the Gateway canonical request to the correct OpenAI request shape used
by the adapter.

Keep reasoning summaries/opaque reasoning state separate from raw text.

Do not assume private chain-of-thought is available.

--------------------------------------------------
xAI
--------------------------------------------------

Use the official model capability table.

Important semantic trap:

For normal Grok reasoning models, `reasoning.effort` may control reasoning
depth.

For the documented multi-agent model, the similarly named parameter controls
agent behavior/count, NOT ordinary reasoning depth.

DO NOT normalize those as equivalent semantics.

If the Gateway does not have a clean canonical representation for agent
count, leave that provider-specific feature out of this PR rather than
mislabeling it as normal reasoning effort.

For models where reasoning cannot be disabled:
mandatory = true
and the UI must not expose Off.

--------------------------------------------------
Z.AI / GLM
--------------------------------------------------

Preserve the current working GLM behavior but replace brittle global regex
assumptions with documented model capability entries/families.

Current Z.AI documentation distinguishes:
- default thinking models;
- hybrid models;
- forced-thinking models.

A forced-thinking model must not expose an Off toggle.

Do not infer support for a future GLM model from "GLM" in its name alone.

==================================================
5. AGGREGATORS — ROUTE CAPABILITY, NOT BLIND INHERITANCE
   ==================================================

This is the most important regression-hardening portion.

The capability of:

    model X through provider A

is NOT automatically identical to:

    model X through provider B

even if they refer to the same base model.

Define:

    effective capability
        =
    model semantic capability we can prove
        INTERSECT
    route/aggregator capability we can prove

No route may gain a capability simply because another route has it.

==================================================
6. NANOGPT
   ==================================================

Upgrade NanoGPT model discovery to use the official detailed model metadata
when available:

    GET /api/v1/models?detailed=true

Parse and retain relevant capability metadata.

In particular:

    capabilities.reasoning

is authoritative evidence that the NanoGPT ROUTE supports reasoning for that
model.

Do not infer reasoning from model name when detailed metadata says otherwise
or does not establish it.

NanoGPT's Extended Thinking documentation supports canonical controls such
as reasoning effort and output exclusion, but model-specific semantics may
still differ.

Rules:

1. `capabilities.reasoning !== true`
   -> do not expose reasoning capability.

2. `capabilities.reasoning === true`
   -> route supports reasoning.

3. Exact native-model mapping exists
   -> intersect NanoGPT route support with the reviewed native capability
   to determine:
   - mandatory;
   - can disable;
   - exact efforts;
   - special semantics.

4. No exact native mapping
   -> do NOT invent native effort/mandatory semantics.
   Expose only controls that NanoGPT itself explicitly guarantees for
   that route and which can be represented safely.

5. `:thinking` / `-thinking`
   -> NEVER construct these suffixes heuristically.
   They are usable only when that exact model ID/alias is returned by
   NanoGPT or explicitly documented.

6. `reasoning.exclude`
   -> controls response visibility, NOT compute enablement.

Normalize both:
- `reasoning`
- legacy `reasoning_content`
  where required by the existing Gateway response contract.

==================================================
7. OPENROUTER
   ==================================================

Use runtime OpenRouter model metadata as the PRIMARY route capability source.

GET /api/v1/models may expose:

    reasoning.supported_efforts
    reasoning.default_effort
    reasoning.default_enabled
    reasoning.mandatory
    reasoning.supports_max_tokens
    etc.

Parse and retain these documented fields.

Do not replace this with hardcoded model-name rules.

Rules:

- no reasoning object / no documented reasoning capability
  -> do not assume effort selection;

- supported_efforts
  -> UI/API accepts only those values;

- default_effort
  -> preserve it as model metadata;

- mandatory=true
  -> reasoning cannot be turned off;

- supports_max_tokens
  -> only then expose budget/max-token reasoning control if Gateway
  supports it safely.

Normalize:
- `reasoning`;
- `reasoning_details`;
- output exclusion;
- replay state required for multi-turn/tool continuation.

Do not flatten signed/opaque reasoning_details into arbitrary text.

==================================================
8. OLLAMA
   ==================================================

Do not decide reasoning support from model name alone.

Model listing currently may use `/api/tags`, but model details are available
through `/api/show`.

Audit the best architecture for enriching installed Ollama models with model
detail/capability information without creating unbounded N+1 calls.

Use:
- `/api/tags` for installed model enumeration;
- `/api/show` capability metadata where documented and useful;
- official Ollama Thinking documentation/catalog for exact behavioral rules.

Cache/bound detail lookups appropriately if needed.

Important documented special case:

GPT-OSS does NOT behave like the simple boolean thinking models.

Its Ollama `think` control uses:
low
medium
high

and cannot simply be treated as:
true / false

Do not send boolean `think` to GPT-OSS and call it supported parity.

Other Ollama thinking-capable models may accept booleans and/or documented
levels.

Model each proven family correctly.

NVIDIA Nemotron:

Do not mark all Nemotron models as reasoning-capable because NVIDIA describes
Nemotron reasoning capabilities.

An exact Ollama model must be confirmed by:
- Ollama's official thinking catalog; OR
- documented/runtime Ollama capability metadata;
  and exact model identity must be established.

No:
model name contains "nemotron" -> reasoning=true

==================================================
9. EXPLICIT MODEL IDENTITY / ALIAS MAPPING
   ==================================================

We need a reviewed mapping when aggregator IDs differ from native IDs.

Create a small, explicit model-identity mapping mechanism.

Conceptually each mapping should include:

    routeProvider
    routeModelId

    nativeProvider
    nativeModelId OR explicitly documented native family

    equivalence:
      exact | documented-alias

    evidence/provenance

Do NOT support:
- fuzzy matching;
- Levenshtein matching;
- display-name matching;
- arbitrary substring matching;
- "same vendor therefore same model";
- guessed version normalization.

Examples of acceptable evidence:

- aggregator model ID explicitly contains the canonical provider/model ID and
  provider metadata confirms ownership;
- official aggregator catalog documents it as that exact underlying model;
- official provider docs document the alias.

If equivalence cannot be proven:

    do not inherit native capability metadata.

This does NOT mean the aggregator model cannot expose reasoning.

It means its route capability must stand on aggregator/runtime evidence alone.

==================================================
10. BUILD A CAPABILITY CONFORMANCE MATRIX
    ==================================================

Add a documented matrix for every reasoning-capable chat model we officially
support in this PR.

Prefer a machine-readable registry as the source of truth.

If a Markdown matrix is also required, derive it from the same data or add a
test preventing drift.

Do not maintain two unrelated hand-written sources of truth.

The matrix should be able to answer:

    Native provider
    Native model
    Route provider
    Route model ID
    Identity proven?
    Reasoning supported?
    Default enabled?
    Mandatory?
    Toggle supported?
    Supported effort levels
    Default effort
    Budget-token control?
    Reasoning output visibility control?
    Response reasoning representation
    Replay requirement
    Evidence source / reviewed date

For example, we should be able to compare conceptually:

    native model X
    NanoGPT model X
    OpenRouter model X
    Ollama model X

WITHOUT assuming all four routes expose identical controls.

When equivalence and route support are both proven, normalized Gateway
capabilities should match wherever semantics actually match.

When the aggregator exposes a smaller capability set, Gateway must expose the
intersection rather than the native superset.

==================================================
11. CANONICAL CAPABILITY RESOLUTION
    ==================================================

Implement one central capability resolver.

Conceptually:

    resolveChatReasoningCapability({
        providerId,
        modelId,
        discoveredModelMetadata
    })

For native providers:

    reviewed native registry
        -> effective capability

For OpenRouter:

    OpenRouter runtime reasoning metadata
        + explicit native identity mapping where useful
        -> conservative intersection
        -> effective capability

For NanoGPT:

    detailed capabilities.reasoning
        + explicit native identity mapping where available
        + documented NanoGPT controls
        -> conservative effective capability

For Ollama:

    installed model metadata
        + official Ollama model behavior
        + explicit base-model mapping where proven
        -> effective capability

Do not duplicate capability resolution in every adapter and again in the UI.

==================================================
12. PROVIDER ADAPTER REQUEST MAPPING
    ==================================================

After validating the canonical request against effective capability,
translate it in the provider adapter.

Audit and implement the correct native wire format for each supported
provider.

Examples of provider concepts to verify from official docs:

Anthropic:
thinking config
output_config.effort
legacy budget_tokens where applicable

DeepSeek:
thinking.type
reasoning_effort

Google:
thinking_level

Groq:
reasoning_effort where supported
include_reasoning where supported

Moonshot:
thinking.type for applicable K2 models
reasoning_effort for K3

Mistral:
reasoning_effort on documented models

OpenAI:
reasoning.effort / correct adapter endpoint representation

xAI:
reasoning effort only when semantic is reasoning depth

Z.AI:
thinking.type

OpenRouter:
reasoning object

NanoGPT:
documented reasoning / reasoning_effort representation

Ollama:
think boolean OR documented effort level depending on model

These are NOT blanket provider capabilities.
Always check the effective selected-model capability first.

==================================================
13. RESPONSE NORMALIZATION / PRESERVED REASONING
    ==================================================

Audit both non-streaming and streaming response paths.

Do not only harden request parameters.

Providers expose reasoning differently:

- reasoning
- reasoning_content
- reasoning_details
- ThinkChunk
- thought summaries
- opaque/signature blocks
- message.thinking

Normalize user-displayable reasoning only when the provider exposes it as
displayable content.

Preserve opaque/provider state required for continuation WITHOUT pretending
it is readable chain-of-thought.

Where provider documentation requires previous reasoning state to be replayed
during:
- tool calls;
- multi-step reasoning;
- multi-turn continuation;

make sure the Gateway does not accidentally strip that state.

Do not expose secrets or opaque signatures in ordinary UI text.

Do not force every provider's reasoning representation into one lossy string
if doing so breaks required replay semantics.

Prefer extending current reasoning/reasoningDetails contracts minimally over
inventing an entirely separate subsystem.

==================================================
14. ADMIN WEB / CHAT LAB
    ==================================================

Remove model-name/provider heuristics from reasoning controls.

The UI must render strictly from normalized model capability metadata.

Expected behavior:

reasoning unsupported / unknown
-> no reasoning control

reasoning supported, toggle proven
-> enable/disable control

mandatory reasoning
-> show reasoning capability, but no Off option

effort levels:
-> show ONLY effective supportedEfforts

no proven effort support
-> no effort selector

budget-token control not supported
-> do not show it

reasoning output exclusion supported
-> expose separately from reasoning enable/disable

Clearly distinguish:

    Disable reasoning compute

from:

    Hide/exclude reasoning output

The UI must not contain a second independent provider/model capability
database.

==================================================
15. REGRESSION TEST MATRIX
    ==================================================

This PR exists specifically because reasoning support regressed.

Add meaningful tests at several levels.

A. Native capability registry
-----------------------------

For every supported native provider:
- known reasoning model -> expected capability;
- known non-reasoning model -> unsupported;
- unknown future model -> unsupported unless metadata explicitly proves it;
- exact supported efforts;
- mandatory behavior;
- disable behavior.

B. Native request mapping
-------------------------

For each supported model/provider combination:
- canonical request -> correct provider wire payload;
- unsupported effort rejected before HTTP;
- mandatory model cannot be disabled;
- no reasoning request does not inject unsupported fields.

C. NanoGPT
----------

Fixture for detailed `/models`:
- reasoning=true parsed;
- reasoning=false parsed;
- missing reasoning parsed conservatively;
- exact returned IDs respected;
- no invented :thinking suffix;
- mapped native model gets correct intersection;
- unmapped model does not inherit guessed native semantics.

D. OpenRouter
-------------

Fixtures proving:
- supported_efforts parsed;
- default_effort parsed;
- default_enabled parsed;
- mandatory parsed;
- missing reasoning metadata does not create reasoning support;
- supported effort selector matches runtime metadata.

E. Ollama
---------

Fixtures proving:
- non-thinking installed model -> no thinking controls;
- documented thinking model -> correct capability;
- GPT-OSS -> low/medium/high level mapping;
- GPT-OSS is not treated as boolean true/false;
- unknown installed model does not gain thinking because its name sounds like
  a reasoning model.

F. Native / aggregator parity
-----------------------------

For every exact reviewed identity mapping:

    canonical native capability
    versus
    aggregator effective capability

Assert the expected semantic intersection.

The purpose is to catch regressions such as:

- native GLM gets thinking but NanoGPT GLM does not;
- aggregator claims an effort unsupported by the native model;
- native model is mandatory reasoning but aggregator UI exposes Off;
- OpenRouter runtime metadata changes but UI still uses an old hardcoded
  heuristic;
- Ollama GPT-OSS receives boolean think;
- model without reasoning gets a thinking control.

G. Response/replay
------------------

Cover relevant provider response shapes:
- reasoning;
- reasoning_content;
- reasoning_details;
- thinking chunks;
- opaque signatures/state;
- streaming accumulation where supported.

Make sure the normalized final answer remains correct and provider-required
state is not lost.

==================================================
16. LIVE CAPABILITY AUDIT TOOL — OPTIONAL BUT USEFUL
    ==================================================

If it fits cleanly within the existing developer/admin tooling, add a
NON-DESTRUCTIVE development command/script that can inspect currently
available models and print normalized reasoning capability diagnostics.

Example conceptual output:

    Provider: openrouter
    Model: ...
    Runtime reasoning metadata: yes
    Native identity: verified / unknown
    Effective reasoning: yes
    Efforts: low, medium, high
    Mandatory: false
    Provenance: runtime + native registry

For NanoGPT, this can consume detailed model metadata.

For Ollama, it can inspect installed models.

Do NOT make CI depend on live third-party APIs.

Do NOT require real API keys for unit tests.

If this tool adds disproportionate complexity, skip it and explain why.

==================================================
17. CURRENT DOCUMENTED EDGE CASES TO PROTECT
    ==================================================

Re-verify these against official docs before encoding them, but explicitly
look for regressions around them:

- Anthropic:
  effort availability differs by model;
  thinking mode and effort are different controls;
  some current models cannot disable thinking.

- DeepSeek:
  thinking and reasoning effort;
  documented effort mappings may differ from requested values.

- Gemini:
  supported thinking levels differ by model.

- Groq:
  supported reasoning models and effort sets differ by model family.

- Kimi:
  K3 / K2.7 / K2.6 do NOT have identical controls.

- Mistral:
  Chat API exposing a reasoning_effort parameter does not imply every Mistral
  model supports adjustable reasoning.

- OpenAI:
  supported reasoning effort values/defaults are model-dependent.

- xAI:
  multi-agent reasoning_effort semantics are not ordinary reasoning depth.

- Z.AI:
  some models are hybrid/default-thinking/forced-thinking.

- Ollama:
  GPT-OSS uses levels rather than boolean thinking.

- OpenRouter:
  use per-model runtime reasoning metadata.

- NanoGPT:
  detailed capabilities.reasoning exists;
  reasoning suffixes must not be invented.

==================================================
18. DOCUMENTATION
    ==================================================

Add/update one architectural document explaining:

    Model capability != provider capability.

and:

    Effective capability =
        documented model semantics
        intersected with
        documented/discovered route semantics.

Explain the precedence rules.

Document:

- native registry;
- aggregator runtime metadata;
- explicit model identity mappings;
- unknown/unsupported behavior;
- UI behavior;
- output exclusion vs reasoning disable;
- response-state preservation;
- source provenance.

Include the reviewed capability matrix.

Add a very visible rule:

    NEVER ADD A REASONING MODEL/CAPABILITY WITHOUT EVIDENCE.

==================================================
19. DO NOT FIX REGRESSIONS WITH MORE HEURISTICS
    ==================================================

Forbidden fixes include:

    if (model.includes("glm")) ...
    if (model.includes("reasoner")) ...
    if (model.endsWith(":thinking")) ...
    if (provider === "openrouter") return true
    if (provider === "nanogpt") return true
    if (model.includes("nemotron")) return true

unless a VERY narrowly scoped family matcher is explicitly justified by
official provider documentation that guarantees the entire documented family
shares the exact capability.

Even then:
- encapsulate it;
- document it;
- test its positive and negative boundaries.

Prefer exact model IDs and provider metadata.

==================================================
20. MIGRATION / BACKWARD COMPATIBILITY
    ==================================================

Audit existing Gateway API consumers before changing public contracts.

If existing providerOptions for Anthropic/ZAI/OpenRouter/Ollama are public:

- do not casually break them;
- determine whether they are internal or externally exposed;
- add a migration/deprecation path if required;
- keep one canonical internal representation.

Do not leave two permanent competing reasoning systems.

If backward compatibility requires translating legacy providerOptions into
the canonical reasoning request, centralize that translation and test it.

==================================================
21. QUALITY GATES
    ==================================================

Run at minimum:

- package/domain tests;
- contract tests;
- provider adapter tests;
- model discovery tests;
- Gateway API tests;
- Admin API tests if capability metadata crosses it;
- Admin Web tests;
- lint;
- typecheck;
- build;
- git diff --check.

Run existing PR14 evaluation tests as regression tests because evaluation
profiles reuse normal provider execution.

Do NOT alter evaluation behavior merely to make these tests pass.

Do not mass-format unrelated files.

Report exact commands and exact outcomes.

==================================================
22. FINAL REPORT
    ==================================================

At completion provide:

1. Existing regression/root-cause summary.
2. Files changed.
3. Canonical reasoning capability design.
4. Canonical request design.
5. Native provider matrix.
6. Aggregator matrix.
7. Exact native<->aggregator model mappings added.
8. Mappings deliberately NOT added because equivalence could not be proven.
9. Provider wire translations.
10. Response/replay normalization.
11. UI changes.
12. Tests added.
13. Quality-gate results.
14. Remaining unsupported/unknown models.
15. Follow-up candidates for image/video capability hardening.

For every unsupported model that looked plausible but lacked sufficient
official evidence, explicitly list it as:

    NOT ENABLED — insufficient evidence

rather than guessing.

Do not claim parity merely because two model names look similar.

==================================================
ACCEPTANCE CRITERIA
==================================================

This PR is complete only when:

- no selected model is assumed to support reasoning without evidence;
- unknown models default safely to no reasoning controls;
- supported native providers correctly translate canonical reasoning controls;
- NanoGPT consumes detailed model reasoning capability metadata;
- OpenRouter consumes per-model reasoning metadata;
- Ollama correctly handles its documented model-specific thinking semantics;
- exact aggregator/native model mappings are explicit and reviewed;
- no fuzzy model matching exists;
- effective capability is conservative when route/native semantics differ;
- mandatory reasoning cannot be disabled;
- unsupported effort levels are rejected locally;
- output exclusion is distinct from disabling reasoning;
- reasoning response state needed for continuation is preserved;
- frontend controls come from normalized capability metadata;
- regression tests compare native and aggregator routes;
- existing chat/evaluation behavior remains green.

Primary invariant:

    Same proven model + same proven semantic capability
        -> same normalized Gateway behavior across routes.

Secondary invariant:

    If equivalence or capability cannot be proven,
        the Gateway does not invent it.

Chat first.
Image/video capability parity is a separate follow-up PR.


== Do not invent capabiliies. In doubt, use official documentation:


===
Anthropic
https://platform.claude.com/docs/en/build-with-claude/effort
https://platform.claude.com/docs/en/build-with-claude/thinking

Deepseek
https://api-docs.deepseek.com/guides/thinking_mode

Google
https://ai.google.dev/gemini-api/docs/thinking?hl=fr#javascript_1
https://ai.google.dev/gemini-api/docs/thinking?hl=fr#signatures

Groq:
https://console.groq.com/docs/reasoning <- Supported models are mentionned

Moonshot
https://platform.kimi.ai/docs/guide/use-thinking-models
https://platform.kimi.ai/docs/guide/use-reasoning-effort

Mistral
https://docs.mistral.ai/api/endpoint/chat#operation-chat_completion_v1_chat_completions_post

OpenAI
https://developers.openai.com/api/docs/guides/text
https://developers.openai.com/api/docs/guides/reasoning

xAI
https://docs.x.ai/developers/model-capabilities/text/reasoning

Z.AI (GLM)
https://docs.z.ai/guides/capabilities/thinking-mode
https://docs.z.ai/guides/capabilities/thinking

Ollama
https://docs.ollama.com/capabilities/thinking
- model listed are supported: https://ollama.com/search?c=thinking
- Nvidia Nemotron: https://developer.nvidia.com/topics/ai/nemotron

Open Router
- https://openrouter.ai/docs/guides/best-practices/reasoning-tokens
- Each model in GET /api/v1/models may include a reasoning object describing which effort levels it accepts and whether reasoning is mandatory:

NanoGPT
https://docs.nano-gpt.com/api-reference/endpoint/models
- capabilities (detailed mode)
  Common capability flags:
  Field	Type	Description
  vision	boolean	Supports image inputs
  reasoning	boolean	Supports extended thinking/reasoning <- Permet de déterminer le match versus provider natif?
  tool_calling	boolean	Supports function/tool calling
  parallel_tool_calls	boolean	Supports multiple tool calls in parallel
  structured_output	boolean	Supports structured/JSON output modes
  pdf_upload	boolean	Supports PDF/document inputs
  video_input	boolean	Supports video inputs for text or multimodal understanding
