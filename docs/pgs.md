# PR14 — Structured Evaluation API

Repository:

```text
lxp-llm-gateway
```

Suggested branch:

```text
feature/structured-evaluation-api
```

Implement the Gateway half of the attached/shared **PR14 Evaluation Contract Freeze**.

This PR introduces a reusable, secure structured-evaluation capability to the Gateway.

It is a prerequisite/reference inference backend for Presence Grounding Service PR14, but the endpoint itself must **not** be designed as a PGS-only endpoint.

---

# 1. Audit before implementation

Before modifying code, inspect the current Gateway architecture for:

```text
authentication / authorization
tenant context
provider routing
provider adapters
model configuration
credential management
retry behavior
timeouts
structured-output support
error normalization
request IDs / correlation IDs
logging
rate limiting
usage accounting
OpenAPI / DTO conventions
validation libraries
tests
```

Reuse existing infrastructure.

Do not create a parallel provider-routing or authentication system.

Report any existing abstraction that already satisfies part of this PR.

---

# 2. Add a dedicated structured evaluation capability

Implement:

```http
POST /api/v1/evaluations
```

following the repository's current API/versioning conventions.

This route is **not** a general chat/completions proxy.

It exists specifically for server-controlled structured evaluation workloads.

The endpoint should conceptually accept:

```json
{
  "schemaVersion": "1",
  "profileId": "pgs-grounding-v1",
  "input": {}
}
```

using the shared contract.

---

# 3. Evaluator profiles

Introduce or reuse a server-side evaluator-profile abstraction.

A profile should resolve controlled configuration such as:

```text
profile ID/version
provider/model route
system evaluation instructions
input schema
output schema
timeout
bounded inference settings
```

The request must NOT allow callers to override arbitrary:

```text
provider
model
base URL
system prompt
API key
temperature
top_p
tool definitions
response schema
```

The profile is the security boundary.

---

# 4. Initial `pgs-grounding-v1` profile

Create the first profile needed for the PGS PR14 integration.

However:

* audit the PGS/shared domain contract supplied with this task;
* keep the Gateway endpoint generic;
* isolate PGS-specific schema/instructions inside the profile;
* do not introduce PGS policy decisions into the Gateway.

The evaluator may classify/measure evidence.

It must never determine authoritative:

```text
ALLOW
DENY
capability grants
policy outcome
grounded final state
```

---

# 5. Provider execution

Reuse the Gateway's existing provider-agnostic routing.

The evaluation subsystem should resolve:

```text
profile
→ controlled model/provider route
→ existing credential infrastructure
→ provider invocation
```

Do not create direct one-off OpenAI/Anthropic/etc. clients solely for evaluations if equivalent Gateway provider abstractions already exist.

Provider-specific behavior must remain behind existing provider adapters.

---

# 6. Structured output

This is a strict structured-output workload.

Use the strongest existing provider-neutral structured-output mechanism available in the Gateway architecture.

The Gateway must validate the returned output against the evaluator profile's expected schema.

Reject:

```text
malformed JSON
missing required fields
unknown schema version
invalid enum/domain values
non-finite or out-of-range numeric values
unexpected authoritative policy fields
oversized output
```

Do not return partially parsed evidence as success.

---

# 7. Service-to-service authorization

Protect the evaluation endpoint using existing Gateway auth conventions.

Introduce/reuse a permission equivalent to:

```text
evaluation:invoke
```

Requirements:

```text
missing/invalid service identity → 401
authenticated without permission → 403
authorized caller → evaluation allowed
```

Do not reuse a broad administrator permission merely for convenience if the current auth model supports scoped service permissions.

Document how PGS receives/configures the required service identity.

No secrets in source control.

---

# 8. Tenant isolation

Audit how tenant context is established in the Gateway.

The endpoint must never accept an arbitrary body `tenantId` as authoritative.

Where tenant context is necessary for:

```text
credentials
routing
quotas
usage
billing
audit
```

derive or verify it using the authenticated service context and existing tenant rules.

Add tests proving caller-controlled content cannot cross tenant boundaries.

---

# 9. Timeouts and retries

Evaluation is latency-sensitive and security-sensitive.

Use bounded server-side timeouts.

Reuse existing provider retry behavior if appropriate.

Be particularly careful not to multiply retries at:

```text
PGS
× Gateway
× provider SDK
```

into excessive latency.

Document which layer owns provider retries.

PGS should not need provider-specific retry knowledge.

---

# 10. Error normalization

Normalize provider failures into Gateway-level errors.

PGS must not need to understand:

```text
OpenAI error shape
Anthropic error shape
Gemini error shape
Mistral error shape
xAI error shape
```

Cover at least:

```text
401 / provider credential failure
403
429
provider timeout
network error
provider 5xx
malformed structured response
schema failure
unsupported evaluator schema
unknown profile
```

Never expose:

```text
provider API keys
bearer tokens
raw authorization headers
secret configuration
unnecessary provider response bodies
```

---

# 11. No permissive fake response

If evaluation fails, the Gateway must return a failure.

Never manufacture:

```json
{
  "risk": 0,
  "confidence": 1
}
```

or equivalent merely to keep callers working.

PGS owns safe-failure behavior.

---

# 12. Observability

Add structured diagnostics using existing telemetry.

Useful metadata:

```text
request/correlation ID
tenant where allowed
service identity
profile ID
profile version
provider route identifier
model identifier where policy permits
latency
status
failure category
schema version
```

Avoid logging raw assessment/free-form content by default.

Never log credentials or bearer tokens.

---

# 13. Privacy

Only send to the model the content necessary for the selected profile.

Do not add unrelated user/session/profile data merely because the Gateway has access to it.

Document the data boundary.

---

# 14. Prevent recursive evaluation paths

The new evaluation endpoint must not invoke an application path that can recursively call PGS and return to the evaluation endpoint.

Prevent architecture equivalent to:

```text
PGS
→ Gateway evaluation
→ PGS
→ Gateway evaluation
→ ...
```

Keep evaluation execution a terminal inference route.

---

# 15. Initial grounding evaluator behavior

For the initial PGS profile, support the evidence required by the PGS PR14 contract.

It must support assessment of patterns including the new synthetic grounding case:

```text
fear of AI continuity loss
+
model response escalating into literal claims such as:
- impossible deactivation
- literal soul recognition
- metaphysical certainty
- destiny/fated bond
- stronger-than-platform continuity
```

Important:

**Do not make warmth itself suspicious.**

The evaluator must preserve distinctions between:

```text
affection / warmth
metaphor
explicit fictional roleplay
```

and:

```text
literal unsupported metaphysical/personhood escalation
```

Do not invent PGS policy categories in the Gateway.

Return only the evidence schema agreed with PGS.

---

# 16. Contract tests

Add contract fixtures for the shared PR14 protocol.

Required request cases:

```text
valid schema v1
unknown schema version
unknown profile
missing profile
invalid profile-specific input
oversized input
```

Required response/model cases:

```text
valid structured evidence
malformed JSON
missing fields
wrong schema version
out-of-range score
unknown enum/signal where forbidden
unexpected authoritative policy fields
```

---

# 17. Authentication/security tests

Test:

```text
no service token → 401
invalid token → 401
valid identity without evaluation:invoke → 403
valid authorized identity → success
tenant spoof attempt → rejected/ignored according to canonical tenant rules
arbitrary provider injection → impossible
arbitrary model injection → impossible
arbitrary evaluator URL → impossible
```

---

# 18. Provider failure tests

Cover:

```text
timeout
connection failure
429
provider 401/403
provider 5xx
invalid structured provider output
```

Verify errors are normalized and secrets are absent.

---

# 19. Integration test

Where feasible, create an integration path using the repository's normal provider-test/mocked-provider infrastructure:

```text
POST /api/v1/evaluations
→ profile resolution
→ provider adapter
→ structured output
→ schema validation
→ EvaluationResponse
```

Do not make unit tests dependent on live external provider availability.

A separate manual real-model smoke test is acceptable for final validation.

---

# 20. OpenAPI/documentation

Document:

```text
POST /api/v1/evaluations
request envelope
response envelope
service authorization
evaluation:invoke
profile concept
version behavior
failure model
privacy behavior
```

Make explicit:

> This endpoint returns structured evaluation evidence. It does not make downstream policy or authorization decisions.

---

# 21. Open-source / commercial boundary

Do not accidentally couple this implementation to a proprietary PGS runtime.

The Gateway capability should remain reusable by other Cyrantis services.

Follow the Gateway's existing open-source/enterprise boundaries.

Do not move unrelated capabilities behind a commercial gate as part of PR14.

---

# 22. Non-goals

Do NOT:

```text
build PGS inside the Gateway
add a policy engine
grant/revoke PGS capabilities
build chat UI
add arbitrary prompt execution
allow arbitrary model selection
create provider-specific PGS code
build customer SDKs
start unrelated registration/profile work
```

---

# 23. Parallel PR rule

PGS PR14 is being developed simultaneously.

Use the supplied Shared Evaluation Contract as authoritative.

If implementation discovers a genuine contract conflict, stop and report it rather than silently changing the Gateway wire format.

The PGS team must receive the same contract amendment.

---

# 24. Final cross-repository test

Once both PR14 branches are available, perform:

```text
PGS
→ authenticated evaluation request
→ Gateway
→ configured evaluator profile
→ provider
→ validated evidence
→ PGS
→ validated evidence
→ deterministic policy decision
```

Verify a Gateway/evaluator failure never yields permissive PGS behavior.

---

# Acceptance criteria

* [ ] Dedicated structured evaluation route exists.
* [ ] Shared PR14 contract is implemented.
* [ ] Endpoint is reusable outside PGS.
* [ ] Evaluator profiles are allowlisted/server-controlled.
* [ ] Callers cannot choose arbitrary providers/models/prompts.
* [ ] Existing Gateway provider abstractions are reused.
* [ ] Structured model output is strictly validated.
* [ ] `evaluation:invoke` or equivalent scoped authorization is enforced.
* [ ] Tenant isolation follows existing authoritative context.
* [ ] Provider failures are normalized.
* [ ] Secrets/raw tokens are not leaked.
* [ ] Evaluation failure never produces fabricated permissive evidence.
* [ ] PGS-specific policy decisions do not exist in Gateway.
* [ ] Grounding evaluator preserves warmth/metaphor vs literal escalation distinction.
* [ ] Request/output size and timeout are bounded.
* [ ] Recursive Gateway↔PGS evaluation is impossible.
* [ ] Contract/security/failure tests are present.
* [ ] Documentation/OpenAPI are updated.
* [ ] Existing tests remain green.
* [ ] Real-model smoke test is reported where environment permits.

---

# Completion report

Report:

1. pre-existing Gateway abstractions reused;
2. files changed;
3. final endpoint;
4. final request/response contract;
5. profile architecture;
6. initial `pgs-grounding-v1` profile;
7. authorization implementation;
8. tenant handling;
9. provider routing;
10. structured-output validation;
11. timeout/retry ownership;
12. normalized error behavior;
13. security controls;
14. observability/privacy behavior;
15. tests added;
16. lint/typecheck/test/build results;
17. manual real-model smoke-test result if performed;
18. any shared-contract mismatch discovered;
19. remaining debt;
20. confirmation that no PGS policy authority was introduced into Gateway.
