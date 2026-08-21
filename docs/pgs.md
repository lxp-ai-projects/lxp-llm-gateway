# PR14 Stabilization — Provider Credential Architecture Cleanup

Repository:

```text
lxp-llm-gateway
```

Branch:

```text
feature/pgs-integration
```

This is a **focused cleanup/correction pass**.

Do not modify the `presence-grounding-service` repository.

Do not redesign M2M authentication.

Do not change the frozen Structured Evaluation wire contract.

Do not add a new credential system.

The purpose of this task is to remove an unnecessary provider-secret resolution path introduced during PR14 and restore the Gateway's existing encrypted database-backed provider credential architecture as the canonical source of provider credentials.

---

# 1. Problem statement

The Gateway already has an established provider credential model backed by persistent encrypted storage.

Existing concepts include provider credentials scoped conceptually to:

```text
USER
TENANT
```

with encrypted persistence and existing credential-resolution services.

PR14 subsequently introduced optional provider secrets through environment variables such as:

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

and a provider credential resolution path conceptually equivalent to:

```text
USER credential from database
        ↓
TENANT credential from database
        ↓
PLATFORM credential from environment
```

This duplicates provider-secret storage and mixes two different concepts:

```text
credential ownership/scope
```

and:

```text
secret storage backend
```

That is not the desired PR14 architecture.

---

# 2. Architectural decision

For PR14, provider credentials have **one canonical persistent source of truth**:

> the Gateway's existing encrypted provider credential repository.

The desired conceptual model is:

```text
Provider Credential Repository
        │
        ├── USER scoped
        │
        └── TENANT scoped
```

For the PGS service caller:

```text
SERVICE: pgs
tenant: lxp-internal
scope: evaluation:invoke
        ↓
pgs-grounding-v1
        ↓
Gateway resolves configured provider/model
        ↓
Gateway resolves TENANT provider credential
        ↓
provider execution
```

A service-only PGS request must never automatically use a user's personal BYOK credential.

---

# 3. Frozen PGS / Gateway responsibilities

Do not change these boundaries:

```text
PGS
→ chooses evaluator profile only
→ pgs-grounding-v1
```

PGS does NOT choose:

```text
provider
model
provider credential
system prompt
provider URL
inference parameters
```

The Gateway owns:

```text
profile resolution
provider routing
model routing
tenant/provider policy
provider credential resolution
provider execution
structured output validation
provider observability
provider error normalization
```

The Gateway remains multi-provider.

Do not hardcode NanoGPT anywhere in the PGS integration path.

---

# 4. First perform an audit

Before changing code, identify all usages of provider-secret environment variables and classify each as:

```text
A. provider credential secret
B. provider runtime configuration
C. test-only fixture/config
D. unrelated legacy behavior
```

Examples of **provider secrets**:

```text
NANOGPT_API_KEY
OPENAI_API_KEY
ANTHROPIC_API_KEY
```

Examples of potentially valid **runtime configuration**:

```text
NANOGPT_BASE_URL
provider request timeout
provider endpoint configuration
feature flags
```

Do not blindly delete provider-specific environment configuration.

The target of this cleanup is specifically the duplicated **provider secret/API-key fallback**.

Report the audit before broad architectural changes.

---

# 5. Remove environment-backed provider credential fallback from PR14

Remove the PR14 credential path that obtains provider API keys directly from environment variables.

Audit and remove/refactor code such as:

```text
getPlatformProviderAccess(...)
```

or its current equivalent if that method exists specifically to resolve provider secrets from environment variables.

After this cleanup, Structured Evaluation must not succeed merely because:

```text
NANOGPT_API_KEY
OPENAI_API_KEY
...
```

exists in the process environment.

---

# 6. Keep runtime provider configuration

Do NOT remove legitimate runtime settings such as:

```text
BASE_URL
TIMEOUT
provider feature flags
transport settings
```

where they remain part of the provider adapter's established configuration model.

The rule is:

```text
provider behavior/configuration
→ environment/config is acceptable

provider secret credential
→ canonical credential repository
```

Do not conflate the two.

---

# 7. PGS SERVICE_ONLY credential behavior

For:

```text
principalKind = SERVICE
integrationClient = pgs
tenant = lxp-internal
```

provider credential resolution must be:

```text
resolve configured evaluation profile
        ↓
resolve provider/model
        ↓
look for active TENANT credential
for that tenant/provider
        ↓
credential found
    → execute

credential missing
    → fail closed / NOT READY
```

Do not query USER credentials for a service-only caller.

Do not inject a default user.

Do not use the Integration Client creator's credential.

Do not copy or promote a USER credential automatically.

---

# 8. User requests must keep existing behavior

Do not break regular Gateway use.

Audit the existing user-facing provider credential semantics and preserve them.

If established behavior is conceptually:

```text
USER request
    ↓
USER credential when allowed
    ↓
TENANT credential according to configured policy
    ↓
fail
```

preserve that behavior.

Do not rewrite the complete credential precedence system merely to fix Structured Evaluation.

This cleanup is principally about:

```text
SERVICE_ONLY evaluation workloads
```

and eliminating the duplicated provider-secret environment store.

---

# 9. Do not implement PLATFORM credentials in PR14

Do not replace environment variables with another hastily-created PLATFORM secret model.

For PR14:

```text
SERVICE evaluation
→ TENANT provider credential
→ otherwise fail closed
```

is sufficient.

A future Cyrantis-managed service may legitimately require:

```text
PLATFORM provider credentials
```

but that must be designed separately as a first-class credential ownership model using the same credential-storage abstraction.

Future conceptual design may be:

```text
Credential owner type
├── USER
├── TENANT
└── PLATFORM
```

backed by:

```text
encrypted DB / secret-store abstraction
```

rather than:

```text
PLATFORM == environment variable
```

Do NOT implement that future model in this task.

Document it as deferred.

---

# 10. Simplify tenant provider policy accordingly

Audit settings such as:

```text
credentialMode
allowPlatformFallback
allowTenantFallback
preferUserCredentials
```

Do not retain meaningless configuration.

For PR14 Structured Evaluation:

```text
SERVICE_ONLY
→ tenant provider credential required
```

If `allowPlatformFallback` exists solely to activate environment-backed provider secrets for this new PR14 path, remove/deprecate it from the PR14 evaluation behavior.

If it has established non-PR14 uses, preserve it only for those uses and document clearly that Structured Evaluation does not depend on an env-backed platform credential.

Do not silently change unrelated customer behavior.

---

# 11. Make tenant credential management usable from the Control Plane

The backend already supports tenant-scoped provider credentials.

The Admin Web must expose that functionality cleanly.

Audit the current:

```text
Provider Tokens
Tenant → Provider Configurations
```

surfaces.

Add or complete a tenant-scoped provider credential workflow.

The operator should be able to:

```text
select tenant
select provider
create tenant credential
replace/rotate tenant credential
disable/delete tenant credential
see safe credential metadata
```

without editing `.env`.

---

# 12. Tenant credential UI

In the appropriate tenant/provider management surface, support something conceptually equivalent to:

```text
Provider: NanoGPT

Credential source
TENANT

Credential
••••••••••••••

[ Save credential ]
```

After saving, display only sanitized information such as:

```text
Scope: TENANT
Provider: NanoGPT
Status: Active
Hint: ***8031
Created: ...
Updated: ...
```

Never return the decrypted secret to React after creation.

Follow the existing create/replace credential security pattern.

---

# 13. Preserve USER credential management

Do not remove the existing personal `Provider Tokens` capability.

The distinction should be explicit:

```text
Provider Tokens / personal credentials
→ USER scoped

Tenant provider credentials
→ TENANT scoped
```

The UI must not imply that a user's personal provider token automatically becomes available to service workloads.

---

# 14. Improve Evaluation Lab preflight

The current readiness surface is useful and should remain.

For:

```text
pgs-grounding-v1
```

show sanitized information such as:

```text
Provider
NanoGPT

Model
mistralai/...

Credential
Tenant credential available
```

or:

```text
Credential
Unavailable

Reason
No tenant-scoped credential is configured for NanoGPT.
```

Do NOT instruct the operator to configure:

```text
NANOGPT_API_KEY
OPENAI_API_KEY
...
```

as a normal resolution path.

Instead provide a UI/action hint directing the operator to the existing tenant credential management surface.

Example:

> No tenant-scoped NanoGPT credential is configured for this tenant. Add one under Tenant → Provider Credentials.

---

# 15. Remove misleading Evaluation Lab instructions

Remove messages equivalent to:

```text
configure NANOGPT_API_KEY
or enable platform fallback
```

from the normal Structured Evaluation readiness UX.

The normal operator workflow should be:

```text
Profile not ready
        ↓
Add tenant provider credential
        ↓
Profile ready
```

No environment editing required.

---

# 16. Keep multi-provider profile resolution explicit

The Evaluation Lab must continue to display the **resolved** provider and model because that is useful operational metadata.

For example:

```text
Profile: pgs-grounding-v1
Provider: nanogpt
Model: mistralai/mistral-large...
```

But these values remain server-controlled.

The operator must not be given freeform provider/model overrides in the Lab.

If the profile configuration changes to:

```text
Provider: mistral
```

the readiness logic must automatically look for the tenant's Mistral credential.

No PGS code change is allowed or required.

---

# 17. Credential resolver must remain provider-agnostic

Avoid logic such as:

```ts
if (providerId === 'nanogpt') {
...
}
```

The resolver should conceptually do:

```ts
resolveTenantCredential({
  tenantId,
  providerId,
});
```

using the same repository/storage path for every supported provider.

Adding a provider later should not require adding another PR14 credential environment variable.

---

# 18. Clean ProviderCredentialService

After removing environment credential fallback, simplify `ProviderCredentialService`.

It should express domain intent clearly.

Conceptually:

```text
resolveForUser(...)
resolveForTenant(...)
resolveForRequest(...)
```

or existing equivalent methods.

Do not maintain dead branches for the removed env-backed platform fallback.

Do not create another PR14-specific credential resolver alongside the existing repository.

Reuse the current credential persistence infrastructure.

---

# 19. Preserve encryption and secret handling

Provider secrets must continue to use the existing encrypted persistence mechanism.

Verify:

```text
secret encrypted at rest
secret decrypted only server-side when required
secret never returned in normal read responses
secret never logged
secret never appears in audit metadata
secret never appears in Evaluation Lab
```

Do not weaken encryption merely to simplify tenant credentials.

---

# 20. Error semantics

If `pgs-grounding-v1` resolves successfully to a provider/model but no eligible tenant provider credential exists, return the existing normalized Structured Evaluation failure:

```text
evaluation_provider_credential_unavailable
```

with the agreed unavailable/readiness status.

Do not return:

```text
401
```

because the PGS Integration Client authenticated successfully.

Do not return:

```text
403 evaluation_service_forbidden
```

unless `evaluation:invoke` or another actual authorization policy fails.

Do not confuse:

```text
M2M authentication
```

with:

```text
provider credential readiness
```

---

# 21. Readiness must use the same production resolver

Do not implement one credential check for:

```text
Evaluation Lab preflight
```

and another for:

```text
POST /api/v1/evaluations
```

Both must depend on the same canonical credential resolution service.

Otherwise the Lab may report:

```text
READY
```

while real evaluation fails.

Add a regression test proving readiness and execution use the same eligibility rules.

---

# 22. Direct Gateway evaluation remains independent from Admin UI

After this cleanup, the following must work with the PGS technical key:

```text
POST /api/v1/evaluations
```

without:

```text
Admin Web
Admin API
human browser session
default user
```

assuming:

```text
M2M identity is valid
evaluation:invoke exists
tenant provider credential exists
profile/provider/model are allowed
```

The Evaluation Lab remains a diagnostic convenience only.

---

# 23. Remove provider-secret variables from deployment examples

Audit:

```text
.env.example
Quickstart
VPS environment examples
Compose templates
deployment docs
structured-evaluations docs
Evaluation Lab docs
provider credential docs
```

Remove PR14 guidance requiring provider API secrets such as:

```text
OPENAI_API_KEY
NANOGPT_API_KEY
...
```

where those were added as database-bypassing provider credential fallbacks.

Do not remove legitimate endpoint/timeout variables.

Do not remove test fixture variables if a self-contained test explicitly requires them; instead clearly mark them test-only and ensure production runtime does not depend on them.

---

# 24. Documentation — canonical provider credential model

Update the canonical architecture documentation to state:

```text
Provider credentials are managed through the Gateway credential repository.

Credential ownership:
- USER
- TENANT

Provider secrets are encrypted at rest.

SERVICE_ONLY workloads do not use USER credentials.

Structured Evaluation requires an eligible TENANT credential for
the provider resolved by its server-controlled evaluation profile.

Platform credentials are deferred and are not represented by
provider API-key environment variables in PR14.
```

---

# 25. Documentation — distinguish the two credentials

Make this explicit:

```text
Credential A
PGS → Gateway

Gateway Integration Client technical API key
scope: evaluation:invoke
tenant bound
```

versus:

```text
Credential B
Gateway → model provider

Provider credential
scope/owner: TENANT for PR14 service workload
stored through the encrypted credential repository
```

These credentials have completely different purposes.

Do not use the term `API key` without context when documentation could confuse the two.

---

# 26. Documentation — multi-provider behavior

Document:

```text
pgs-grounding-v1
        ↓
Gateway profile configuration
        ↓
provider + model
        ↓
provider credential lookup
for the active tenant
```

Example:

```text
profile provider = NanoGPT
→ look for tenant NanoGPT credential

profile provider = Mistral
→ look for tenant Mistral credential

profile provider = OpenAI
→ look for tenant OpenAI credential
```

PGS does not change.

---

# 27. Remove/deprecate misleading platform credential wording

Audit documentation and UI for phrases such as:

```text
optional platform credentials
platform API key
enable platform fallback
```

If these refer specifically to the environment-secret implementation introduced by PR14, remove them.

If the product already had a legitimate separate concept called platform credentials, document that clearly and ensure PR14 does not depend on environment-backed secrets.

Do not preserve ambiguous terminology.

---

# 28. Migration

Prefer **no database migration** if the existing credential model already supports tenant-scoped credentials.

Do not add a new provider credential table merely for this cleanup.

If a migration genuinely becomes necessary, explain exactly what capability is missing from the current model before implementing it.

Do not add PLATFORM ownership/schema in this task.

---

# 29. Tests — credential resolution

Add/update tests proving:

```text
SERVICE + tenant credential exists
→ uses tenant credential

SERVICE + only USER credential exists
→ does NOT use user credential

SERVICE + no tenant credential
→ provider credential unavailable

SERVICE + env provider API key exists
→ env key is NOT used as provider credential

USER request + user credential
→ existing user behavior preserved

profile changed from provider A to provider B
→ resolver looks for provider B credential
```

---

# 30. Tests — readiness

Cover:

```text
profile resolves provider/model
tenant credential exists
→ READY

profile resolves provider/model
only personal credential exists
→ NOT READY

tenant credential missing
→ PROVIDER_CREDENTIAL_UNAVAILABLE

profile switched provider
→ readiness follows new provider

readiness and actual evaluation
→ use the same credential resolver
```

---

# 31. Tests — Admin API / Web

Cover:

```text
create tenant provider credential
replace tenant provider credential
disable/delete tenant provider credential
secret never returned
secret hint displayed safely

personal credential remains personal

Evaluation Lab NOT READY
→ links/directs to tenant credential management

Evaluation Lab READY
→ after tenant credential is configured
```

---

# 32. Tests — no environment secret fallback

Add an explicit regression test.

Configure:

```text
NANOGPT_API_KEY = some-test-secret
```

with:

```text
no tenant NanoGPT credential in DB
```

Then run service-only evaluation readiness/execution.

Expected:

```text
credential unavailable
```

The environment provider secret must not make the request ready.

This test prevents the duplicate credential path from silently returning later.

---

# 33. Preserve security boundaries

Do not regress:

```text
SERVICE_ONLY principal
tenant binding
evaluation:invoke
Integration Client key scoping
personal BYOK isolation
provider/model allowlisting
strict structured evaluation
evidence-only contract
PGS policy authority
```

---

# 34. Do not touch PGS

No changes in:

```text
presence-grounding-service
```

are required for this cleanup.

PGS should continue sending:

```text
profileId = pgs-grounding-v1
```

and must remain unaware of:

```text
NanoGPT
OpenAI
Mistral
provider credentials
tenant provider credential storage
```

---

# 35. Do not broaden scope

Do NOT:

```text
add OAuth client_credentials
add mTLS
restore Default user
create synthetic users
redesign Integration Clients
change scope semantics unless required by the separate scope stabilization task
implement PLATFORM credential ownership
add a new secrets manager
change PGS
redesign provider adapters
add provider selection to Evaluation Lab
start PR15
```

---

# 36. Required manual validation

After implementation, use one real tenant.

## Step 1 — M2M identity

Confirm:

```text
SERVICE: pgs
tenant: lxp-internal
evaluation:invoke
```

passes its direct self-test.

## Step 2 — no tenant credential

Remove/disable the appropriate tenant credential.

Expected:

```text
pgs-grounding-v1
→ resolved provider/model
→ NOT READY
→ PROVIDER_CREDENTIAL_UNAVAILABLE
```

Even if the equivalent provider environment API-key variable is present.

## Step 3 — create tenant provider credential using Control Plane

Example:

```text
Tenant: lxp-internal
Provider: current pgs-grounding-v1 provider
Scope: TENANT
Credential: configured through Admin UI/API
```

Expected:

```text
profile readiness = READY
credential source = TENANT
```

## Step 4 — direct data-plane test

Using the PGS Integration Client key:

```text
POST /api/v1/evaluations
```

Expected:

```text
200
structured evidence
```

## Step 5 — Evaluation Lab

Run the same profile through the Lab.

Expected:

```text
SUCCEEDED
structured evidence
```

## Step 6 — multi-provider proof

Change the server-controlled test/evaluator profile to another already-supported provider if credentials/configuration are available.

Create/configure the corresponding TENANT credential.

Verify:

```text
no PGS code change
no Evaluation Lab request-shape change
no credential env variable required
```

and evaluation succeeds through the other provider.

This proves that Structured Evaluation remains genuinely multi-provider.

---

# Quality gates

Run from a clean checkout:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
git diff --check
```

Also run:

```text
Quickstart Compose validation
VPS Compose validation
```

where part of the existing PR14 validation workflow.

Do not suppress failures.

---

# Acceptance criteria

This cleanup is complete only when:

* provider secrets are no longer resolved from provider API-key environment variables for PR14 Structured Evaluation;
* the existing encrypted credential repository is the canonical provider-secret source;
* USER provider credentials remain supported;
* TENANT provider credentials remain supported;
* PGS SERVICE_ONLY never consumes USER BYOK;
* PGS SERVICE_ONLY uses an eligible TENANT provider credential;
* no Default user is required;
* no platform credential fallback is required for PR14;
* no provider is hardcoded;
* `pgs-grounding-v1` remains server-controlled and multi-provider;
* tenant credential management is usable from Admin Web/API;
* Evaluation Lab readiness points to tenant credential configuration rather than `.env`;
* readiness and execution use the same resolver;
* `.env.example` and deployment docs no longer advertise duplicate provider-secret storage;
* provider runtime settings such as base URLs/timeouts remain where legitimate;
* documentation distinguishes M2M credential from provider credential;
* no database migration was introduced unless objectively necessary;
* no PGS changes were required;
* automated tests are green;
* clean-checkout build is green;
* direct M2M evaluation succeeds using a DB-backed TENANT provider credential;
* Evaluation Lab succeeds through the same path;
* a second provider can be used without changing PGS code.

---

# Completion report

Report:

1. all provider-secret environment variables discovered;
2. which were introduced/used as credential fallback;
3. which legitimate runtime provider configuration variables were preserved;
4. files changed;
5. removed credential fallback code;
6. final ProviderCredentialService resolution flow;
7. USER credential behavior;
8. TENANT credential behavior;
9. SERVICE_ONLY credential behavior;
10. platform credential behavior/deferred status;
11. Admin API tenant credential changes;
12. Admin Web tenant credential changes;
13. Evaluation Lab readiness changes;
14. `.env.example` changes;
15. Quickstart/VPS changes;
16. canonical documentation changes;
17. tests proving environment provider keys are no longer used;
18. tests proving USER credentials are excluded for SERVICE_ONLY;
19. tests proving TENANT credentials work;
20. multi-provider regression result;
21. lint result;
22. typecheck result;
23. test result;
24. build result;
25. Compose validation results;
26. direct `/api/v1/evaluations` result;
27. Evaluation Lab result;
28. remaining PR14 credential debt, if any.

Do not begin any unrelated feature after completing this cleanup.

The desired final architecture is intentionally boring:

```text
PGS SERVICE
    │
    │ Integration Client credential
    ▼
Gateway
    │
    │ resolves server-controlled provider/model
    ▼
Encrypted TENANT provider credential repository
    │
    ▼
Provider
```

No duplicated provider-secret environment store.
No synthetic user.
No personal credential borrowing.
No provider-specific logic in PGS.
No wheel reinvention.
