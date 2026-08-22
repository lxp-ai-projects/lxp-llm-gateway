# Provider SDK reasoning refactor PRs

The implementation is prepared as four stacked PRs. Each PR should target the
previous PR branch so that review remains bounded; after merge, the next PR can be
retargeted to `main`.

## PR 1 - Detect reasoning model families independently of transport

Branch: `refactor/reasoning-family-detection`

- add Claude, OpenAI reasoning, xAI Grok, and GLM family detection
- cover native, NanoGPT, and OpenRouter naming conventions
- exclude known non-reasoning and media identifiers

## PR 2 - Add the reasoning transport compatibility matrix

Branch: `refactor/reasoning-compatibility-matrix`

- replace GLM-specific conditionals with an explicit family/transport table
- expose request mapping and visible-reasoning fidelity
- fail closed for combinations without verified support

Documentation evidence is captured in ADR-014. Live NanoGPT/OpenRouter validation
was not run because the environment did not contain provider API keys.

## PR 3 - Map family options in aggregator adapters

Branch: `refactor/aggregator-reasoning-options`

- extend shared options for OpenAI and xAI reasoning effort
- centralize validation and mapping in `model-family-capabilities`
- map Claude, OpenAI, xAI, and GLM controls in NanoGPT/OpenRouter
- retain legacy NanoGPT GLM and OpenRouter reasoning behavior
- reject mismatches and lossy or ambiguous mappings before fetch

## PR 4 - Expose aggregator fidelity and structured errors

Branch: `refactor/aggregator-fidelity-metadata`

- identify preflight token counting as unavailable on aggregator responses
- distinguish post-response provider-reported usage
- parse safe structured fields from relayed upstream errors
- preserve normalized metadata through the provider seam and Gateway 502 response
- update architecture, scope, gateway contract, and ADR documentation

## Validation

Required local gates:

- `pnpm --filter @lxp/domain test`
- `pnpm --filter @lxp/model-family-capabilities test`
- `pnpm --filter @lxp/provider-nanogpt test`
- `pnpm --filter @lxp/provider-openrouter test`
- `pnpm --filter @lxp/gateway-api test`
- affected package typechecks, workspace lint, build, and format check

Required credentialed follow-up:

- one Claude and one effort-based reasoning request through each aggregator
- assertion that the upstream honors rather than silently strips the control
- capture sanitized request IDs and model IDs as PR evidence
