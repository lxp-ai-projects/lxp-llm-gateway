# Augure text provider: implementation plan

Status: proposed for review; no provider implementation is included. Source baseline: repository `main` inspected on 2026-09-27 and [Augure API documentation](https://augureai.ca/docs/api) inspected on the same date. Confirm the local branch and migration sequence before implementation.

## 1. Current architecture findings

`packages/domain/src/index.ts` owns `ProviderId`, display names, and the supported-provider list. `packages/provider-sdk/src/index.ts` defines `LlmProviderAdapter`, `ProviderExecutionContext`, model and chat contracts. `apps/gateway-api/src/gateway/gateway.module.ts` is the runtime composition root; application services use the adapter registry. ADR-003 explicitly records this concrete-package import at the composition root. `apps/admin-api/src/admin/admin-catalog.service.ts` has a separate adapter registry for model discovery. Provider credentials, tenant enablement, model rules, audit, and usage are already generic.

`OpenAiCompatibleTextProviderAdapter` in `packages/provider-sdk/src/openai-compatible-text-provider.ts` supplies `GET /models`, `POST /chat/completions`, Bearer authentication, base-URL override, timeout, response/usage mapping, error parsing, and raw SSE stream passthrough. DeepSeek and Moonshot subclass it; Mistral customizes the request body; OpenAI has a separate adapter because it also owns image capabilities. The common request body is `{ model, messages, stream, user: context.userId, max_tokens: request.maxOutputTokens }` plus a reasoning mapping only when configured. `JSON.stringify` omits undefined values. The common adapter does not forward temperature, `top_p`, stop, `stream_options`, or canonical JSON output format. The LXP text contract supports strings and `text`/`image_url` parts, but no PDF `file` part or generic tool calls.

The admin web receives the provider list from the backend and sorts it generically. Its credential validation and translated error keys still name individual providers. Model discovery resolves reasoning metadata through `@lxp/model-family-capabilities` in both API applications.

## 2. Augure compatibility assessment

### Confirmed by published API contract

- SDK base URL `https://api.augureai.ca/v1`; Bearer API key; `GET /v1/models`; `POST /v1/chat/completions`.
- Request fields `model`, `messages`, `stream`, `max_tokens`, `temperature`, `top_p`, and `stop`; text and `image_url` message parts. JSON responses use OpenAI choices and usage fields. Errors use an OpenAI-style `error` object.
- SSE uses `delta` chunks and `data: [DONE]`; `stream_options.include_usage` is documented, but the shared adapter does not send it.
- The documented `/models` example contains `auto`, `ossington-5`, `rosedale-1`, `ossington-4`, `ossington-4-1`, and `tofino-3`. The documented `gpt-*` compatibility aliases are absent from that example. Only an authenticated live response can establish whether those aliases ever appear in discovery.
- The non-stream response example includes `_augure.gateway_region`, `_augure.inference_region`, and `_augure.request_id`.

### Likely compatible, requiring a probe or contract test

- The shared adapter's ordinary text request, response, usage, errors, and raw SSE transport fit the documented shapes.
- Existing `image_url` content parts should fit the documented format. Check an actual request through LXP because accepted URL schemes, size limits, and `detail` behavior may differ.

### Unknown

- Augure does not document the shared adapter's automatic `user` field. Probe with and without it. If rejected, use `buildRequestBody` in Augure to omit `user` while retaining the shared HTTP client and other fields.
- The docs do not specify a reasoning request control, reasoning response fields, JSON-schema/structured-output parameters, tool-call request/response contract, or aliases in a live `/models` result. Do not claim support for these on compatibility language alone.
- LXP has a canonical `outputFormat: 'json'`, but the common adapter does not map it. Structured evaluation on Augure needs its own explicit compatibility decision and test; do not silently advertise it.

## 3. Proposed design

Create `@lxp/provider-augure` with a small `AugureProviderAdapter extends OpenAiCompatibleTextProviderAdapter`. Set provider ID/display name, default URL, and validated request timeout (follow Moonshot's defensive timeout parsing). Keep the shared default paths, Bearer header, model discovery, response normalization, and streaming. Do not add a second HTTP client. Add `buildRequestBody` only if the `user` probe fails. Add `mapModels` only if live discovery returns aliases that should be removed; filter only documented `gpt-*` compatibility aliases, preserving any future native model IDs. Do not hardcode a catalog.

## 4. File-by-file change plan

| Path | Why and intended change |
| --- | --- |
| `packages/domain/src/index.ts` | Add `augure` to `PROVIDER_IDS` and `Augure` to `PROVIDER_DISPLAY_NAMES`; leave image/video ID lists unchanged. |
| `packages/provider-augure/package.json`, `packages/provider-augure/tsconfig.json` | Add the workspace package using Moonshot's build/test layout and existing dependencies. |
| `packages/provider-augure/src/index.ts` | Add the minimal adapter, default URL, timeout parsing, narrowly selected metadata mapping, and conditional model filtering/request-body mapping if probes require them. |
| `packages/provider-augure/src/index.test.ts` | Add mocked-fetch tests for the provider behavior below. |
| `apps/gateway-api/package.json`, `apps/gateway-api/src/gateway/gateway.module.ts` | Declare the package and instantiate it at the existing composition root. |
| `apps/admin-api/package.json`, `apps/admin-api/src/admin/admin-catalog.service.ts` | Add package/build preparation, admin catalog adapter registration, and platform access mapping. |
| `apps/gateway-api/src/gateway/provider-credential.service.ts`, `apps/admin-api/src/admin/admin.service.ts` | Add `AUGURE_API_KEY` and `AUGURE_BASE_URL` to the two other platform-credential maps. Existing encrypted tenant/user BYOK remains generic. |
| `apps/admin-api/src/admin/admin-provider-access.ts` | Require a token for Augure credentials and allow `api.augureai.ca` for safe admin catalog lookups. Keep the HTTPS and host checks. |
| `apps/admin-api/src/persistence/migrations/1713000000022-AddAugureProvider.ts` | Candidate next migration after the observed `...0021`: insert active `augure`/`Augure` with `ON CONFLICT DO NOTHING` and non-destructive down. Recheck for newer local migrations before fixing this number. |
| `apps/admin-web/src/features/providers/lib/provider-utils.ts` | Add Augure to the token-required frontend validation. Generic provider/model option builders need no special branch. |
| `apps/admin-web/src/i18n/generated/providers.en.json`, `apps/admin-web/src/i18n/generated/providers.fr.json`, `apps/admin-web/src/i18n/generated/providers.de.json`, `apps/admin-web/src/i18n/generated/providers.es.json` | Add the token-required validation key in each locale, using the repository's localization generation workflow if present. No icon or dedicated UI is needed. |
| `packages/model-family-capabilities/src/chat-reasoning.ts` | Add exact reviewed native Augure model facts only if the capability policy in section 5 is accepted. No request-control mapping. |
| `pnpm-lock.yaml` | Refresh the workspace lockfile after adding the package and API dependencies. |
| `docs/delivery/augure-provider-plan.md`, `docs/product/augure-provider-requirements.md`, `docs/architecture/decisions/ADR-017-augure-text-provider.md` | Maintain the approved plan, product requirements, and provider-specific decision record. |
| `docs/SCOPE.md`, `docs/product/system-scope.md`, `docs/architecture/overview.md` | At implementation time, list Augure as a supported text provider and explain use of the existing seam; distinguish implemented from QA-verified support. |

Conditional test updates: `apps/gateway-api/src/gateway/provider-credential.service.test.ts`, `apps/admin-api/src/admin/admin-catalog.service.test.ts`, `apps/admin-api/src/admin/admin-provider-access.test.ts`, `apps/admin-api/src/admin/admin.service.test.ts`, `apps/admin-web/src/features/providers/hooks/use-providers-controller.test.tsx`, and `apps/admin-web/src/pages/providers-page.test.tsx` where provider lists, access validation, or environment maps are asserted. The gateway bootstrap test uses a generic fake registry and need not change merely to add an ID. Recheck other provider enumerations with `rg` before editing.

## 5. Model and reasoning strategy

Use `/models` as the catalog. `auto` is a dynamic route whose backing model can vary per request; expose it if discovered, but leave static reasoning capability unknown and avoid presenting a fixed capability or output guarantee. `ossington-5` and `rosedale-1` are explicitly described as reasoning models; `ossington-4-1` is described as premium reasoning. A reviewed registry entry in `@lxp/model-family-capabilities` can mark these exact IDs `supported: true`, `controls: []`, with Augure documentation as source. `ossington-4` is described as a multimodal model for complex reasoning work, which does not establish a controllable reasoning mode: leave capability unknown pending evidence. `tofino-3` is described as “thinking off”; leave capability unknown rather than inventing a toggle or a reliable `supported: false` API declaration. New/unknown model IDs remain unknown. If the provider API later supplies reasoning capability metadata, let the common mapper and existing resolver consume it.

The Augure docs do not specify `reasoning_effort`, `thinking`, or another control. The first implementation can show reviewed reasoning support without controls and must reject LXP reasoning-control requests via existing validation. Do not add an Augure entry to the domain thinking-transport map until a request/response contract exists. Do not infer replayable reasoning content from model marketing language.

## 6. Credential/configuration strategy

Use `ProviderAccessConfig.apiKey` and standard Bearer auth for platform, tenant, and user/BYOK credentials. Wire `AUGURE_API_KEY` and `AUGURE_BASE_URL` into all three platform maps. Use `AUGURE_REQUEST_TIMEOUT_MS` in the package, defaulting to the existing 90-second text-adapter convention; Augure's published 300-second upstream limit is not itself an LXP timeout requirement. Preserve `providerAccess.baseUrl` override, while enforcing the current admin catalog HTTPS/allowlisted-host rule. A custom admin catalog URL should fail closed unless its host is explicitly reviewed; the gateway's existing override behavior must not be widened as part of this provider change. No new secret table or provider-specific encryption is needed.

## 7. Provider metadata strategy

The shared `collectDefaultProviderMetadata()` retains only `id`, `object`, `created`, and `x_*`, so it drops `_augure`. Set `mapProviderMetadata` in the Augure package and copy the generic fields plus a validated, bounded `_augure` subset (`gateway_region`, `inference_region`, `request_id`) when each value is a string. Keep it nested under `_augure`, avoid arbitrary upstream object passthrough, and never include credentials, headers, or prompts. This preserves useful routing/provenance data within the existing `GatewayChatResponse.providerMetadata` contract. Streaming currently passes bytes through and does not create normalized metadata; do not promise `_augure` in streamed responses unless an upstream chunk carries it and the gateway stream contract is separately changed.

## 8. Testing plan

Use `node:test` and mocked `globalThis.fetch`, following DeepSeek/Moonshot. Cover provider ID/display name, URL/default paths, Bearer header, `/models` mapping and conditional alias filtering, chat body (`model`, `messages`, `stream`, `max_tokens`, `user` decision), non-stream content/finish reason, usage, `_augure` preservation and invalid metadata rejection, raw SSE delta/`[DONE]`, OpenAI-format errors, timeout, and custom base URL. Test that reasoning controls and unsupported output constraints are not advertised. Add focused gateway/admin registry and platform/BYOK tests only where enumerations or validation changed; assert admin SSRF allowlist rejects unrelated hosts and HTTP.

No real key in CI. Before accepting compatibility, run optional credentialed smoke probes outside CI: `/models` alias behavior; a minimal chat with/without `user`; `max_tokens`; one text/image-part request; SSE with and without `include_usage`; and, only if relevant to product scope, provider JSON-output/tool contract. Record sanitized request shapes/statuses without prompts or credentials.

## 9. Documentation changes

Keep this delivery plan and its companion product requirements/ADR as proposed until review. On implementation, update `docs/SCOPE.md`, `docs/product/system-scope.md`, and `docs/architecture/overview.md` as required by repository guidance. Add Augure platform environment variables and BYOK setup to the relevant operator guide if platform provisioning is documented there; do not claim QA validation until exercised. Link to the official API contract rather than copying a changing model catalog or price list.

## 10. Risks / open questions

1. `user` may be rejected despite broad OpenAI compatibility; decide from a live probe, then use the adapter's request-body hook only if necessary.
2. The `/models` sample excludes aliases, but an authenticated catalog may include them; filter only observed compatibility aliases to avoid duplicate choices.
3. The generic adapter sends no `stream_options.include_usage`, so streamed usage may be unavailable. Do not add a common-adapter change solely for this provider without a gateway need.
4. Augure's 300-second request limit and LXP's 90-second default may affect slow reasoning calls; measure and document an operator override.
5. Structured evaluation's canonical JSON constraint currently has no shared OpenAI-compatible mapping. Exclude Augure from claims of structured-output support until verified and implemented within the existing seam.
6. Exact tool calls, reasoning controls, output reasoning fields, and PDF parts are outside the current generic LXP text contract or undocumented by Augure. Treat them as future work.
7. Recheck local scaffold and latest migration number: repository inspection used current GitHub `main` because local shell process startup was unavailable during planning.

## 11. Proposed PR breakdown

One focused implementation PR is reasonable: provider package, registration, credentials, safe model discovery, tests, and aligned docs. This planning-only change precedes it. Split only if a verified Augure contract forces a reusable SDK change that other providers also need.

## 12. Acceptance criteria before implementation

- [ ] Confirm local branch state, existing `packages/provider-augure` scaffold, and next migration number.
- [ ] Approve provider ID/name, existing adapter reuse, discovery/alias policy, metadata whitelist, and `auto` capability policy.
- [ ] Decide `user` compatibility from a sanitized Augure probe or document why it remains unverified.
- [ ] Confirm no undocumented reasoning controls, tools, PDF, image generation, or embeddings enter the provider PR.
- [ ] Confirm the exact documentation and test files listed above against local `rg` results.
- [ ] Confirm no real Augure credentials are required for CI.
