# PR14 Provider Credential Stabilization

## Outcome

PR14 Structured Evaluation now uses the existing encrypted credential
repository as its only provider-secret source. A service principal resolves the
active tenant credential matching the provider selected by the server-controlled
profile, or fails closed. Personal credentials and environment-backed platform
fallbacks are excluded from this path.

The implemented decision is recorded in
`docs/architecture/decisions/ADR-012-service-evaluation-provider-credentials.md`.
Execution hardening is recorded separately in
`docs/architecture/decisions/ADR-013-structured-evaluation-execution-hardening.md`.

## Environment Audit

The provider secret names discovered in the pre-existing runtime resolvers were:

```text
ANTHROPIC_API_KEY
DEEPSEEK_API_KEY
GOOGLE_API_KEY
GROQ_API_KEY
MISTRAL_API_KEY
MOONSHOT_API_KEY
NANOGPT_API_KEY
OLLAMA_API_KEY
OPENAI_API_KEY
OPENROUTER_API_KEY
XAI_API_KEY
ZAI_API_KEY
```

Classification:

- Provider credential secrets: all names above when read by the Gateway or
  Admin provider-access resolvers.
- PR14 duplicated path: service-only evaluation previously reached the existing
  environment-backed platform candidate through the general request resolver.
  The service branch now returns only an encrypted tenant credential or fails.
- Legacy behavior retained: interactive user requests and Admin provider catalog
  diagnostics still support their pre-PR14, explicitly enabled platform path.
  PR14 Structured Evaluation never uses it.
- Unrelated integration configuration: `OPENAI_API_KEY` in Open WebUI compose
  files authenticates Open WebUI to the Gateway's OpenAI-compatible facade. It
  is not a Gateway-to-model-provider secret and was not removed.
- Test-only configuration: provider secret assignments in resolver tests are
  fixtures, including the regression proving `NANOGPT_API_KEY` is ignored by a
  service principal.

Legitimate runtime configuration retained includes provider `*_BASE_URL`
endpoint overrides, `NANOGPT_BASE_URL`, evaluator profile provider/model
selection, `LXP_EVALUATION_PGS_GROUNDING_TIMEOUT_MS`, output-token limits, and
the Admin Evaluation Lab timeout. Provider API-key examples added to
`apps/gateway-api/.env.example` for PR14 were removed.

## Implemented Flow

```text
PGS integration-client credential
  -> tenant-bound SERVICE principal with evaluation:invoke
  -> pgs-grounding-v1 profile
  -> Gateway-controlled provider and model
  -> shared ProviderCredentialService resolver
  -> active TENANT credential for tenant + provider
  -> provider adapter behind provider-sdk
```

`USER` callers retain their existing configured user/tenant/platform precedence.
`SERVICE_ONLY` callers do not evaluate that precedence: they query only
`scope=tenant`, `userId=null`, and the resolved provider. First-class platform
ownership remains deferred.

Readiness and execution both call `resolveProviderAccessWithSource`; readiness
does not maintain a second eligibility implementation. A missing tenant
credential is normalized to `evaluation_provider_credential_unavailable` for
execution and `provider_credential_unavailable` for readiness.

## Execution Hardening

`POST /api/v1/evaluations` now requires all three authorization invariants:

- an authenticated integration-client API key;
- a canonical service-only identity with effective `evaluation:invoke` scope;
- `X-Lxp-Expected-Tenant-Id` matching the tenant resolved from the key.

A user-bound integration client is rejected even when it carries the evaluation
scope. A missing or mismatched tenant binding fails authentication. Evaluation
Lab and PGS must be provisioned manually as separate `admin-evaluation-lab` and
`presence-grounding-service` clients with separate keys; no production records
are silently rewritten.

The profile deadline creates an abort signal that crosses `GatewayService` and
the provider-neutral execution context. Text adapters combine it with their
existing transport timeout and pass the result to `fetch`; OpenAI-compatible
providers inherit the same behavior from the shared adapter. The Gateway checks
for cancellation again after provider completion and before success audit or
usage telemetry, so a provider that ignores cancellation cannot create a late
success. Evaluation does not retry, and its timer is cleared on every outcome.

## Control Plane and UX

The Admin API exposes tenant credential list, create, update/rotate,
enable/disable, and delete operations. It reuses the existing encryption service
and persistence entity. Responses include only scope, provider, status, masked
hint, and timestamps; decrypted provider access never crosses into React.

Admin Web exposes this lifecycle under the selected tenant provider
configuration while preserving the personal Provider Tokens workflow.
Evaluation Lab continues to show the resolved provider and model, but missing
credential guidance now points to tenant provider credentials instead of an
environment variable or platform fallback.

The tenant Integration Clients and API Keys tables now group row operations
under an accessible `Actions` menu. Existing handlers, confirmations, pending
states, and destructive styling are preserved. The redundant API-key `Select`
action, which invoked the same edit handler as `Edit key`, was removed.

## Validation Record

Automated validation completed on 2026-08-21:

- `pnpm.cmd --filter @lxp/gateway-api exec tsx --test
  src/evaluations/evaluation.controller.test.ts
  src/evaluations/evaluation.service.test.ts
  src/auth/gateway-auth.service.test.ts src/gateway/gateway.service.test.ts`:
  36 passed.
- `pnpm.cmd --filter @lxp/admin-web exec vitest run
  src/pages/tenants-page.test.tsx`: 5 passed.
- `pnpm.cmd --filter @lxp/provider-nanogpt exec tsx --test
  src/index.test.ts`: 35 passed, including external cancellation forwarding.
- `pnpm.cmd --filter @lxp/gateway-api test`: 97 passed.
- `pnpm.cmd --filter @lxp/admin-api test`: 156 passed.
- `pnpm.cmd --filter @lxp/admin-web test -- --run`: 250 passed across
  46 files.
- `pnpm.cmd --filter @lxp/provider-sdk build` followed by
  `pnpm.cmd typecheck`: passed (10 tasks). The initial cold typecheck exposed
  stale generated SDK declarations, which is recorded under Remaining Debt.
- `pnpm.cmd lint`: passed (10 tasks).
- `pnpm.cmd build`: passed (19 tasks).
- `pnpm.cmd format`: failed because the repository contains 448 existing
  nonconforming files. No bulk formatting was applied, to avoid mixing
  unrelated churn into PR14.
- The Admin Web suite emits pre-existing React `act(...)` warnings from the
  video polling test, but the suite completes with no failures.
- `git diff --check` passed.

The regression coverage verifies tenant credentials for service principals,
exclusion of user credentials, exclusion of environment provider secrets,
provider-agnostic lookup after a profile provider change, shared readiness and
execution resolution, sanitized Admin responses, tenant credential lifecycle,
and Evaluation Lab operator guidance.

The execution-hardening regressions additionally prove service-only identity,
mandatory and matching tenant binding, downstream abort propagation, provider
transport cancellation, timer cleanup, and suppression of late success audit
and telemetry.

The following environment-dependent acceptance checks were not claimed as
automated results: a live PGS integration-client self-test, real provider
execution through `/api/v1/evaluations`, Evaluation Lab execution against that
provider, a live second-provider proof, and Quickstart/VPS Compose startup.
They require deployable credentials and services. Static Compose rendering was
not rerun as part of this hardening pass.

## Remaining Debt

- The pre-PR14 interactive platform fallback and its terminology remain in the
  general user/catalog path for backward compatibility. It is explicitly not a
  service-evaluation credential model.
- The persistence entity retains its historical
  `UserProviderCredentialEntity` name although it stores both user and tenant
  ownership.
- First-class `PLATFORM` ownership requires a separate design and is not part of
  PR14.
- A cold root `typecheck` does not currently build dependency declarations;
  `provider-sdk` must be built first when its public types change.
- Repository-wide formatting and the Video Lab test warnings remain baseline
  maintenance debt outside PR14.
