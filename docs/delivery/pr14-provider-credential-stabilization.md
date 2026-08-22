# PR14 Provider Credential Stabilization

## Outcome

PR14 Structured Evaluation now uses the existing encrypted credential
repository as its only provider-secret source. A service principal resolves the
active tenant credential matching the provider selected by the server-controlled
profile, or fails closed. Personal credentials and environment-backed platform
fallbacks are excluded from this path.

The implemented decision is recorded in
`docs/architecture/decisions/ADR-012-service-evaluation-provider-credentials.md`.

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

## Validation Record

Automated validation completed on 2026-08-21:

- Gateway API tests: 95 passed.
- Admin API tests: 156 passed.
- Admin Web PR14 surfaces: tenant page, Evaluation Lab, and Admin API client
  tests passed as part of the suite.
- Admin Web full-suite contention produced three unrelated 5-second timeouts in
  Login and Chat tests; all 29 affected tests passed when rerun together in
  isolation.
- The repository-wide test gate later reached 245/246 Admin Web tests before an
  unrelated Video Lab rendering assertion failed under parallel load; all 10
  tests in that file passed on the immediate isolated rerun. The global command
  is therefore not recorded as green even though every observed failure passed
  in isolation.
- Gateway API, Admin API, and Admin Web typechecks passed.
- Repository-wide lint passed (10 tasks).
- Repository-wide build passed (19 tasks).
- Quickstart and VPS Compose configuration rendering passed with their example
  environment files.
- `git diff --check` passed.

The regression coverage verifies tenant credentials for service principals,
exclusion of user credentials, exclusion of environment provider secrets,
provider-agnostic lookup after a profile provider change, shared readiness and
execution resolution, sanitized Admin responses, tenant credential lifecycle,
and Evaluation Lab operator guidance.

The following environment-dependent acceptance checks were not claimed as
automated results: a live PGS integration-client self-test, real provider
execution through `/api/v1/evaluations`, Evaluation Lab execution against that
provider, a live second-provider proof, and Quickstart/VPS Compose startup.
They require deployable credentials and services; static Compose rendering is
covered above.

## Remaining Debt

- The pre-PR14 interactive platform fallback and its terminology remain in the
  general user/catalog path for backward compatibility. It is explicitly not a
  service-evaluation credential model.
- The persistence entity retains its historical
  `UserProviderCredentialEntity` name although it stores both user and tenant
  ownership.
- First-class `PLATFORM` ownership requires a separate design and is not part of
  PR14.
