# Augure text provider requirements

Status: proposed for review. This records the intended product behavior, not an implemented or QA-verified integration. See `docs/delivery/augure-provider-plan.md` for the file-by-file plan and unresolved API probes.

## Purpose

Allow an authorized LXP tenant or user to choose Augure for text chat through the existing gateway, model catalog, and credential flows. Maintain the same tenant isolation, model access rules, audit, and usage behavior as other text providers.

## Functional requirements

1. Show Augure in supported text providers when registered and active. Obtain available models from Augure's authenticated `/v1/models` endpoint. Avoid duplicate OpenAI compatibility aliases if they appear in the live catalog.
2. Support non-stream and SSE chat through the shared OpenAI-compatible text adapter, preserving normalized content, finish reason, token usage, and safe provider routing metadata.
3. Accept platform, tenant, and user/BYOK API keys through existing credential storage and routing. Send keys as Bearer tokens; never expose them to the browser or audit payloads.
4. Preserve safe admin model discovery with HTTPS and an Augure host allowlist. Keep custom base-URL overrides subject to existing policy.
5. Show reasoning capability only for exact reviewed model IDs, without controls absent from the Augure API contract. Treat `auto` as a dynamic route with unknown static reasoning capability.
6. Preserve provider ID and selected model in existing usage and audit records. Do not change LXP's provider-neutral telemetry schema.

## Out of scope for the first implementation

Tool/function calling, PDF/file parts, media generation, embeddings, provider-specific reasoning request fields, new credential storage, pricing calculation, and a new HTTP client. Augure supports some additional upstream features, but the current LXP text contract or published Augure request contract does not justify enabling them here.

## Verification requirements

Mocked network tests must cover model discovery, Bearer auth, chat/usage mapping, SSE, errors, timeout, base-URL override, and `_augure` metadata. Credentialed probes must settle the shared adapter's automatic `user` field and actual alias discovery before the implementation is declared compatible. No real key is required in CI. A provider is “implemented” after these checks; “QA-verified” requires separate end-to-end confirmation.

## Source

[Augure API documentation](https://augureai.ca/docs/api), reviewed 2026-09-27.
