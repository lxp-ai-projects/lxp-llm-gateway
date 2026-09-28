# ADR-017: Augure text provider through the shared OpenAI-compatible adapter

## Status

Accepted for implementation on `feature/provider-augure`; live Augure QA remains pending.

## Context

Augure documents OpenAI-compatible model listing and chat completions, Bearer authentication, SSE deltas, usage, and an `_augure` response object. LXP already has `OpenAiCompatibleTextProviderAdapter`; DeepSeek and Moonshot reuse it. The shared default response metadata filter currently omits `_augure`. The default chat body includes a `user` field that Augure does not explicitly document.

## Proposed decision

- Add one `provider-augure` package that subclasses the shared text adapter. Register it in the existing gateway and admin composition roots. Retain existing provider-neutral contracts, credential resolution, and telemetry.
- Discover models from Augure. If authenticated discovery contains documented `gpt-*` compatibility aliases, hide those aliases from LXP's Augure model picker; do not hardcode native model inventory.
- Retain only the documented `_augure` routing/provenance string fields in normalized non-stream metadata, along with the generic default metadata fields. Do not pass arbitrary upstream metadata through.
- Represent exact reviewed reasoning-model facts in `model-family-capabilities` with `controls: []`. Leave `auto` and models without sufficiently specific evidence unknown. Add no reasoning request mapping.
- Use the per-provider `buildRequestBody` hook to omit LXP's internal `user` identifier. Augure does not require it. Authorization, tenant isolation, audit, and usage accounting remain entirely inside LXP; the shared HTTP transport is unchanged.
- Preserve admin catalog HTTPS and host allowlisting by adding only `api.augureai.ca` to its safe-host registry.

## Consequences

The integration remains a small provider implementation behind the current seam. Non-stream responses can expose useful Augure provenance through the existing `providerMetadata` contract. Raw SSE passthrough does not guarantee normalized metadata or usage. Structured output, tools, PDF parts, and reasoning controls remain separate decisions requiring contract evidence.

## Evidence and validation

- [Augure API documentation](https://augureai.ca/docs/api), reviewed 2026-09-27.
- `packages/provider-sdk/src/openai-compatible-text-provider.ts`
- `packages/provider-deepseek/src/index.ts`
- `packages/provider-moonshot/src/index.ts`
- `docs/architecture/decisions/ADR-003-provider-adapter.md`
- `docs/architecture/decisions/ADR-016-chat-reasoning-capability-hardening.md`

Credentialed QA must confirm actual model aliases and that a representative reasoning request completes under the 90-second default during normal workloads. This does not block mocked implementation tests.
