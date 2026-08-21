# PR14 Stabilization — Structured Evaluation / M2M Cleanup

> **Status: non-normative review record.** This file preserves the stabilization
> findings and acceptance checklist. The implemented runtime contract is defined
> by `packages/contracts/src/structured-evaluations.ts`,
> `docs/api/structured-evaluations.md`, and `docs/api/evaluation-lab.md`.

Repository:

```text
lxp-llm-gateway
```

Branch:

```text
feature/pgs-integration
```

This is a **stabilization and cleanup pass**, not a feature expansion.

Do not modify the Presence Grounding Service repository.

Do not redesign M2M authentication.

Do not add another authentication protocol.

The goal is to make the current PR14 implementation reproducible from a clean checkout, remove duplicated/ambiguous authorization logic, freeze the cross-repository evaluation contract, make provider readiness understandable, and leave the Gateway codebase in a genuinely clean state.

---

# 0. Freeze the architecture

The following contract is now frozen:

```text
Caller:
  SERVICE: pgs

Authentication:
  tenant-bound Gateway Integration Client API key

Tenant:
  derived authoritatively from the Integration Client/API key
  and optionally checked through X-Lxp-Expected-Tenant-Id

Authorization:
  evaluation:invoke

Endpoint:
  POST /api/v1/evaluations

Profile:
  pgs-grounding-v1

Provider/model:
  resolved exclusively by Gateway server-side profile configuration

Provider credentials:
  resolved exclusively by the Gateway

Human user:
  not required

Response:
  structured evidence only

Policy authority:
  remains outside the Gateway
```

Do not change this contract during the stabilization pass unless an actual implementation impossibility is demonstrated.

Explicitly do NOT introduce:

```text
OAuth client_credentials
mTLS
synthetic service users
Default user requirements for PGS
forwarded human identity for PGS
PGS-supplied tenant authority
PGS-supplied provider/model/prompt
direct PGS policy decisions in Gateway
```

---

# 1. FIRST: prove repository integrity from a clean checkout

Before changing behavior, inspect the actual Git state.

The reviewed archive contained imports/exports for the following files but did not contain the files themselves:

```text
packages/contracts/src/structured-evaluations.ts

apps/gateway-api/src/evaluations/evaluation.controller.ts
apps/gateway-api/src/evaluations/evaluation-profile.registry.ts
apps/gateway-api/src/evaluations/evaluation.service.ts
apps/gateway-api/src/integration-client-diagnostics.controller.ts

apps/admin-api/src/evaluation-lab/evaluation-lab.controller.ts
apps/admin-api/src/evaluation-lab/evaluation-lab.service.ts

apps/admin-web/src/pages/evaluation-lab-page.tsx
```

The package test scripts also reference missing evaluation tests, and the documentation links to:

```text
docs/api/structured-evaluations.md
docs/api/evaluation-lab.md
```

which were absent from the reviewed archive.

Do not assume this means the local workspace is correct.

Run:

```text
git status --short
git ls-files
git ls-tree -r --name-only HEAD
```

and explicitly verify every PR14 production source, test and documentation file.

Then create a **clean worktree or fresh clone from the current branch HEAD**.

The clean checkout, not the current development workspace, becomes authoritative.

If the files are already tracked in HEAD and the archive was stale/incomplete, report that fact.

If they are not tracked, restore/add the actual implementation before doing any other cleanup.

PR14 cannot be considered valid until a clean checkout contains everything required to build and test the feature.

---

# 2. Preserve the existing service-principal model

The current direction is correct:

```text
GatewayServiceAuthContext

userId = null
userUuid = null
emailHash = null

identitySource = integration-client-service

tenant = authoritative
integrationClientId = pgs
integrationClientKeyId = ...
integrationClientScopes = ...
```

Keep it.

Do not recreate a human user.

Do not automatically substitute:

```text
client creator
tenant admin
tenant owner
browser operator
Default user
```

for a service-only request.

Routes that genuinely require a user may continue to fail closed for `SERVICE_ONLY`.

Structured Evaluation must support `SERVICE_ONLY`.

---

# 3. Fix Integration Client / API key scope semantics

This is a security boundary.

The current effective-scope implementation unions:

```text
integrationClient.scopes
+
apiKey.scopes
```

This makes API-key scopes unable to reliably reduce the parent client's authority and can allow a key scope outside the parent client's configured scope ceiling.

Replace this with explicit least-privilege semantics.

Required model:

```text
Integration Client scopes
= maximum capability ceiling

API Key scopes
= delegated subset

Effective scopes
= intersection(Integration Client scopes, API Key scopes)
```

Requirements:

1. A key may never receive a scope that its parent Integration Client does not have.
2. Create/update API-key validation must reject:

   ```text
   key.scope ∉ client.scopes
   ```
3. Reducing client scopes must immediately cap existing keys through intersection semantics.
4. Expanding client scopes must NOT silently grant the new scope to existing explicitly scoped keys.
5. Creating a key without specifying scopes may copy the current Integration Client scopes as an ergonomic default.
6. Do not use an undocumented magic meaning for `[]`.

Audit existing data before changing behavior.

If historical keys with empty scope arrays previously inherited client scopes, preserve compatibility with an explicit migration/reconciliation that copies the appropriate existing client scopes into those keys.

Do not keep union semantics merely for backwards compatibility.

Add regression tests proving:

```text
client [evaluation:invoke]
key    [evaluation:invoke]
→ evaluation:invoke

client [evaluation:invoke, chat:completion]
key    [evaluation:invoke]
→ evaluation:invoke only

client [chat:completion]
key requests [evaluation:invoke]
→ rejected

client scope removed after key creation
→ removed from effective key authority
```

---

# 4. Establish one canonical Integration Client scope definition

There are currently multiple `IntegrationClientScopeService` / scope-union definitions.

The reviewed tree contained both:

```text
apps/gateway-api/src/auth/integration-client-scope.service.ts
apps/gateway-api/src/gateway/integration-client-scope.service.ts
```

with different supported scope sets.

Remove the dead/duplicate implementation.

Create one canonical scope vocabulary in an appropriate shared package, preferably `@lxp/domain` or `@lxp/contracts`, if that matches existing dependency direction.

Conceptually:

```ts
export const INTEGRATION_CLIENT_SCOPES = [
  'chat:completion',
  'image:generate',
  'image:edit',
  'video:generate',
  'evaluation:invoke',
  'models:list',
  'usage:read',
] as const;

export type IntegrationClientScope =
  (typeof INTEGRATION_CLIENT_SCOPES)[number];
```

Use the same source in:

```text
Gateway API
Admin API DTO validation
Admin Web types/options
tests
```

Do not repeat the literal union in four DTOs, frontend hooks, API client types and service code.

---

# 5. Keep service-only credential resolution fail-closed

The current credential direction is correct.

For:

```text
SERVICE: pgs
```

do not use a personal/user BYOK credential.

Valid provider credential sources are:

```text
TENANT credential
or
explicitly permitted PLATFORM credential
```

according to existing tenant provider configuration.

Do not change this to make the current test pass.

Do NOT:

```text
reuse Patrick's credential
promote/copy a user credential automatically
enable platform fallback automatically
hardcode NanoGPT
create a synthetic provider credential
```

The selected provider remains whatever `pgs-grounding-v1` resolves server-side.

---

# 6. Decouple provider credential domain failure from HTTP semantics

The current:

```ts
ProviderCredentialUnavailableException extends ForbiddenException
```

is misleading because lack of an eligible provider credential is not the same thing as caller authorization failure.

Introduce a small typed domain/infrastructure error for provider credential unavailability.

Conceptually:

```ts
ProviderCredentialUnavailableError
```

It should communicate:

```text
provider credential path could not be resolved
```

without choosing a global HTTP status.

Do NOT globally rewrite the Gateway error architecture.

At the Structured Evaluation boundary, map the condition to:

```text
HTTP 503
code = evaluation_provider_credential_unavailable
```

because the evaluation workload is currently not ready to execute.

Preserve distinct semantics for:

```text
401
  caller/service authentication failed

403
  evaluation:invoke missing
  model/provider denied by tenant authorization policy

429
  provider/evaluation rate limited

502
  upstream provider credential rejected
  invalid structured provider output

503
  configured provider credential path unavailable
  evaluator/provider unavailable
  profile runtime not ready

504
  evaluation timeout
```

Ensure normalized errors never contain provider response bodies or secrets.

---

# 7. Make evaluation readiness explicit

The current Evaluation Lab jumps too quickly from:

```text
Integration Client identity works
```

to:

```text
Run provider inference
```

Introduce a sanitized **profile readiness/preflight** concept.

Reuse existing tenant provider configuration/model-access/credential services rather than duplicating their logic.

For the active tenant and profile, expose safe operator metadata equivalent to:

```text
profileId
profileVersion
schemaVersion

configured: true|false

resolvedProviderId
resolvedModel

tenantProviderEnabled
modelAllowed

credentialPath:
  tenant
  platform
  none

ready: true|false

reasonCode:
  READY
  PROFILE_NOT_CONFIGURED
  PROVIDER_DISABLED
  MODEL_FORBIDDEN
  PROVIDER_CREDENTIAL_UNAVAILABLE
```

Never return:

```text
API key
provider secret
service key
raw credential record
system prompt
```

The operator may SEE which provider/model the server profile resolves to.

The operator may NOT choose/override them from the Evaluation Lab.

Update the Evaluation Lab to display readiness before execution.

For example:

```text
PGS grounding v1
Provider: NanoGPT
Model: ...
Credential source: None
Status: Not ready

No tenant credential or permitted platform fallback
is configured for this profile's provider.
```

This must make it obvious that:

```text
PGS is provider-neutral
```

even when the current server profile happens to resolve to NanoGPT.

---

# 8. Keep M2M identity diagnostics separate from provider readiness

Preserve:

```text
POST /api/v1/integration-clients/self-test
```

as an identity-only diagnostic.

It should verify:

```text
API key valid
SERVICE principal resolved
tenant binding
client ID
effective scopes
```

It must not invoke a model/provider.

Then profile readiness checks:

```text
provider/model/credential/policy readiness
```

Then actual evaluation performs inference.

This gives three deterministic gates:

```text
Gate 1
M2M identity

Gate 2
Evaluation profile readiness

Gate 3
Actual provider execution
```

Do not conflate them.

---

# 9. Clean up Evaluation Lab service credentials

`LXP_ADMIN_EVALUATION_API_KEYS_JSON` currently stores raw tenant→service-key mappings in one environment value.

Do not redesign M2M authentication now.

Instead introduce a narrow server-side abstraction such as:

```ts
EvaluationServiceCredentialResolver
```

with semantics equivalent to:

```ts
resolveForTenant(tenantId): Promise<string | null>
```

The Evaluation Lab service depends on the resolver rather than parsing/owning the whole key map.

Keep an environment-backed resolver as the development/reference implementation.

Document it as such.

This creates a clean seam for future:

```text
Vault
AWS Secrets Manager
Azure Key Vault
Kubernetes Secret
managed Cyrantis credential storage
```

without changing the Evaluation Lab feature.

The key must never reach React.

---

# 10. Freeze the Structured Evaluation v1 wire contract

The Gateway and PGS must implement exactly the same v1 contract.

Audit runtime schemas, OpenAPI and PGS contract.

At minimum reconcile these currently visible differences:

```text
SignalDefinition.dimensions
  PGS has an explicit maximum matching the dimension vocabulary.

ambiguity.reasons
  PGS max = 3.

evaluationId
  PGS max length = 128 and uses a restricted character pattern.

allowedSignals
  PGS requires unique signal IDs.
```

Do not make one side permissive and rely on the other side to reject it.

Create **golden v1 contract fixtures** checked into the Gateway repository:

```text
valid-request.json
valid-response.json
invalid-authoritative-field.json
invalid-schema-version.json
invalid-signal.json
```

They should correspond exactly to the fixtures used in PGS.

Do not create a new cross-repository npm package in this cleanup unless one already exists and is clearly the established solution.

For now:

```text
canonical documented protocol
+ strict local schemas
+ identical golden fixtures
+ conformance tests
```

is sufficient.

---

# 11. Freeze the error-code vocabulary

Define/document the supported Structured Evaluation error codes.

PGS must never need to parse human-readable `message`.

At minimum cover the actual implemented categories:

```text
evaluation_service_forbidden
evaluation_model_forbidden
evaluation_provider_credential_unavailable
evaluation_provider_authentication_failed
evaluation_provider_unavailable
evaluation_timeout
evaluation_invalid_output
unsupported_evaluation_schema
unknown_evaluation_profile
```

Use actual existing code names where they already differ; do not arbitrarily rename stable codes without updating both repos.

Document HTTP status + code + semantic meaning.

Add contract tests for each externally relevant error.

---

# 12. Documentation cleanup

There are currently multiple partial sources of truth.

Create/restore the canonical documents already linked by the Gateway documentation:

```text
docs/api/structured-evaluations.md
docs/api/evaluation-lab.md
```

They must describe implemented behavior, not future prompts.

Update:

```text
docs/api/openapi.yaml
docs/api/gateway-contract.md
docs/architecture/overview.md
docs/architecture/provider-credential-model.md
docs/security/key-management.md
```

The provider credential document is currently still heavily user-centric.

Update it to distinguish:

```text
technical service caller
optional delegated/default user
USER provider credential
TENANT provider credential
PLATFORM provider credential
```

and document SERVICE_ONLY credential resolution.

`docs/pgs.md` currently contains an implementation prompt.

Move it under an explicitly historical/non-normative location or add a prominent:

```text
Status: Non-normative historical implementation brief
```

The canonical docs above must take precedence.

Do not leave broken links.

---

# 13. Audit migration claims

The previous implementation report mentioned a service-only migration.

Audit exactly which migration files were:

```text
created
modified
or merely executed
```

`default_user_id` appears to have already been nullable in the existing integration-client migration.

Do not claim a migration was added if the implementation only reused an existing nullable schema.

Document the actual database delta truthfully.

---

# 14. Keep the Evaluation Lab bounded

Preserve the good restrictions:

```text
no provider selector
no model selector
no system prompt editor
no API key editor
no arbitrary base URL
no temperature/top_p
no PGS ALLOW/DENY
no capability decision
```

The Lab tests the Gateway's **server-controlled evaluator profile**.

PGS remains downstream policy authority.

---

# 15. Avoid unrelated refactors

Do not turn this cleanup into:

```text
Admin Web architecture rewrite
tenant subsystem rewrite
provider registry rewrite
new provider support
new authentication protocol
billing implementation
PGS policy work
```

The Admin Web bundle >500 KiB warning is not a PR14 blocker.

If PR14 additions made an already-large page materially worse, extract only the new focused identity/evaluation components.

Do not perform a broad UI decomposition here.

---

# 16. Required clean-checkout validation

All final validation must be run from a **clean worktree/clone** corresponding to the exact branch HEAD.

Run:

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build

Quickstart Compose validation
VPS Compose validation
git diff --check
```

Also run a source-integrity check proving no relative import or explicit test-script target is missing.

Do not report the current dirty workspace as proof.

---

# 17. Mandatory staged manual validation

Use a configured local tenant and service identity.

## Gate 1 — M2M

Using the exact PGS technical key:

```text
POST /api/v1/integration-clients/self-test
```

Expected:

```text
principalKind = SERVICE
clientId = pgs
tenant = expected tenant
effectiveScopes contains exactly the expected delegated scopes,
including evaluation:invoke
```

No user required.

## Gate 2 — profile readiness

For:

```text
pgs-grounding-v1
```

confirm:

```text
resolved provider/model
tenant provider enabled
model allowed
credential path = tenant or explicitly permitted platform
ready = true
```

If not ready, report the exact reason.

Do not modify policy automatically to make readiness green.

## Gate 3 — direct data-plane evaluation

Call:

```text
POST /api/v1/evaluations
```

directly with the same PGS key and a known-good contract fixture.

Expected:

```text
200
strict structured evidence
```

This test must not involve Admin Web or Admin API.

## Gate 4 — Evaluation Lab

Only after the direct data-plane call succeeds:

```text
Admin Web
→ Admin API
→ Gateway
→ same evaluator profile
```

must also succeed.

---

# 18. Cross-repository gate

Do not change PGS during this task.

Once Gateway Gates 1–4 are stable, provide the exact frozen:

```text
wire contract
error-code table
M2M header contract
golden fixtures
```

to the PGS PR14 branch.

Then perform the final:

```text
PGS
→ Gateway
→ evaluator provider
→ structured evidence
→ PGS validation
→ PGS policy
```

test.

---

# Non-goals

Do NOT:

* restore a required Default user;
* use a personal BYOK credential for SERVICE:pgs;
* enable platform fallback automatically;
* hardcode NanoGPT;
* add OAuth client_credentials;
* add mTLS;
* add provider credentials to PGS;
* let PGS select provider/model/prompt;
* move PGS policy into Gateway;
* invent another evaluation endpoint;
* expand PR14 into unrelated Gateway refactoring.

---

# Acceptance criteria

PR14 Gateway stabilization is complete only when:

* clean checkout contains every PR14 source/test/doc file;
* no broken relative imports exist;
* all explicit test targets exist;
* one canonical scope vocabulary exists;
* API-key scopes cannot exceed Integration Client scopes;
* effective scopes use least-privilege semantics rather than union;
* SERVICE_ONLY remains first-class;
* personal BYOK is never used for service-only PGS;
* provider credential unavailability has a typed semantic boundary;
* Structured Evaluation maps credential unavailability consistently;
* M2M identity and provider readiness are independently diagnosable;
* Evaluation Lab shows sanitized profile readiness;
* Gateway remains multi-provider;
* exact v1 request/response contract matches PGS;
* exact error contract is documented;
* canonical API docs exist and contain no broken links;
* historical prompts are marked non-normative;
* clean-checkout lint/typecheck/test/build are green;
* direct PGS-key evaluation succeeds when provider readiness is configured;
* Evaluation Lab succeeds against the same data-plane capability;
* no PGS policy authority exists in Gateway.

---

# Completion report

Report:

1. clean-checkout/HEAD integrity result;
2. why the reviewed archive had missing PR14 files;
3. exact files restored/tracked if applicable;
4. canonical Integration Client scope definition;
5. old vs new effective-scope semantics;
6. migration/backward-compatibility handling for key scopes;
7. SERVICE_ONLY behavior;
8. provider credential resolution behavior for service principals;
9. typed provider credential failure behavior;
10. exact Structured Evaluation error table;
11. readiness endpoint/service and UI behavior;
12. exact `pgs-grounding-v1` resolved provider/model during validation;
13. credential source used during validation;
14. contract parity/golden fixture result;
15. documentation changes;
16. lint result;
17. typecheck result;
18. tests result;
19. build result;
20. Compose results;
21. direct M2M self-test result;
22. direct `/api/v1/evaluations` result;
23. Evaluation Lab result;
24. remaining PR14 debt, if any.

Do not start another feature until this stabilization pass is reviewed.
