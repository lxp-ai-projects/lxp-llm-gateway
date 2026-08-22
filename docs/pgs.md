You are finishing PR14 on lxp-llm-gateway.

Branch/scope:
- Work only in lxp-llm-gateway.
- Stay within PR14: PGS structured evaluation integration and its security invariants.
- Do not redesign the evaluation architecture.
- Do not add new provider abstractions, retries, caching, streaming, model-selection controls, or PGS policy logic.
- Preserve the existing clean SERVICE principal and TENANT credential architecture.
- Before editing, inspect the current implementation and reuse existing abstractions/error types/helpers wherever possible.

PR14 architecture that MUST remain true:
- POST /api/v1/evaluations is a machine-to-machine evaluation surface.
- PGS does not choose provider, model, system prompt, provider credentials, or inference parameters.
- `pgs-grounding-v1` remains server-controlled.
- SERVICE callers never borrow USER credentials.
- SERVICE callers use TENANT provider credentials only.
- No synthetic/default user is required.
- No provider-secret environment fallback for SERVICE execution.
- Effective API-key permissions remain bounded by the Integration Client scope ceiling.
- No remote -> deterministic evaluator fallback.
- Gateway returns structured evidence only; it never makes PGS policy/capability decisions.

==================================================
1. FIX THE EVALUATION TIMEOUT SEMANTICS
   ==================================================

Current behavior must be audited carefully.

The profile timeout must be a real EXECUTION deadline, not only a Promise.race that stops waiting while the underlying provider request continues.

Desired invariant:

evaluation deadline expires
-> underlying provider execution is actively cancelled
-> provider HTTP request receives cancellation/AbortSignal
-> evaluation returns the existing normalized timeout failure
-> no late success result is accepted
-> no late success telemetry/audit is emitted
-> no second/conflicting completion path occurs

Implementation requirements:

- Prefer AbortController / AbortSignal or the canonical cancellation primitive already used by this repository.
- Propagate the signal through the smallest clean path necessary, conceptually:

  EvaluationService
  -> GatewayService.evaluateProfileChat
  -> executeControlledChat
  -> provider chat execution
  -> underlying HTTP request

- Do not introduce evaluation-specific duplicate HTTP/provider implementations.
- If provider execution already accepts a request context/options object, extend that abstraction rather than creating a parallel path.
- Provider adapters must respect the cancellation signal when making the outbound request.
- Preserve existing provider-level timeout behavior for normal non-evaluation traffic.
- The evaluation profile deadline should be able to terminate the call earlier than a provider's broader default timeout.
- Clear timers/listeners correctly to avoid leaks.
- Use monotonic duration measurement where applicable; do not rely on Date.now() for elapsed-duration precision if the repository already has a better timing primitive.

Error behavior:
- Preserve the existing stable public evaluation timeout contract/status unless there is a documented bug.
- Do not leak provider/internal exception text.
- Cancellation caused by the evaluation deadline must normalize to the evaluation timeout category, not an arbitrary provider/network error.

Telemetry/usage:
- Do NOT weaken quota reservation or pre-provider authorization semantics.
- Reuse the existing failure/aborted execution accounting path.
- Ensure a cancelled provider request cannot later record a success.
- Avoid duplicate failure + success telemetry for the same request.

Tests required:
- provider operation receives an abort/cancellation signal;
- when profile timeout expires, that signal becomes aborted;
- caller receives the expected normalized evaluation timeout;
- underlying provider operation does not continue to a successful completion;
- no late success telemetry is recorded;
- timers/listeners are cleaned up;
- a normal successful evaluation behaves exactly as before;
- normal non-evaluation Gateway chat behavior is not regressed.

Do not fake this test with only:
new Promise(() => undefined)
and asserting the outer call times out.

The test must prove that the downstream operation actually observes cancellation.

==================================================
2. MAKE /api/v1/evaluations EXPLICITLY SERVICE-ONLY
   ==================================================

Audit the current authentication type and use the canonical service-principal discriminator already present in the codebase.

For this PR14 endpoint, enforce the invariant:

    authenticated integration client
    + evaluation:invoke
    + SERVICE principal
    + no bound/default/forwarded user

A user-bound integration identity must NOT be allowed to invoke
POST /api/v1/evaluations merely because it owns evaluation:invoke.

Do not reintroduce a synthetic user.

Do not implement this by checking a display name or hard-coded client ID.
Use the canonical auth-context/service-principal representation.

Expected behavior:
- valid SERVICE_ONLY client + scope -> allowed;
- service client without evaluation:invoke -> forbidden;
- user-bound integration client + evaluation:invoke -> forbidden;
- browser/user authentication -> not accepted as a substitute;
- current PGS SERVICE flow continues working.

Use the repository's existing normalized 401/403 semantics.

==================================================
3. REQUIRE EXPLICIT TENANT BINDING FOR /evaluations
   ==================================================

PGS and Evaluation Lab already send:
X-Lxp-Expected-Tenant-Id

For POST /api/v1/evaluations, make that expected-tenant binding mandatory.

Required invariant:
- header absent -> request rejected using the repository's appropriate normalized validation/auth error;
- header differs from authenticated integration client's tenant -> rejected;
- header matches authenticated tenant -> allowed.

Do not trust the header as the source of tenant identity.
The authenticated credential remains authoritative.
The header is an additional anti-misbinding assertion.

Do not make this mandatory globally for unrelated Gateway endpoints unless the existing architecture explicitly calls for that.

Add controller/auth integration tests.

==================================================
4. KEEP EVALUATION LAB AND REAL PGS IDENTITIES DISTINCT
   ==================================================

Audit development/bootstrap/seed/configuration and documentation.

The intended principals should be conceptually distinct:

- admin-evaluation-lab
  Purpose: Admin Evaluation Lab bridge
  Identity: SERVICE
  Scope: evaluation:invoke

- presence-grounding-service (or the repository's canonical existing PGS client ID)
  Purpose: real PGS runtime
  Identity: SERVICE
  Scope: evaluation:invoke

They may use the same scope but must have distinct client IDs/API keys so audit records clearly identify the caller.

Do not silently rewrite production database records.
If this is provisioning rather than application code:
- fix the development/bootstrap example;
- update documentation;
- document migration/manual provisioning steps if needed.

Do not overload a PGS-labelled client with the admin-evaluation-lab client ID.

==================================================
5. REGRESSION / SECURITY INVARIANTS
   ==================================================

Explicitly retain and test where already covered:

- SERVICE principal has userId/userUuid null.
- No default user required.
- No forwarded user required.
- SERVICE provider credential resolution uses TENANT scope only.
- USER provider credentials are ignored for SERVICE execution.
- Environment/platform provider API secrets are not used as fallback for PGS SERVICE execution.
- Profile provider/model remain controlled by Gateway.
- Changing profile provider still resolves the matching tenant credential without provider-specific PGS logic.
- API key effective scopes cannot exceed parent Integration Client scopes.
- Gateway evidence parsing remains strict.
- No ALLOW/DENY/capability decision is introduced into Gateway.
- No deterministic fallback after remote failure.

==================================================
6. DO NOT INCLUDE THESE IN THIS PR
   ==================================================

Do not implement:
- custom Cyrantis evaluator/model;
- compact-v2 evaluation contract;
- dynamic assessment-question generation;
- cascading models;
- response streaming;
- latency optimizations unrelated to cancellation;
- provider retries;
- new PLATFORM credential ownership model;
- broad custom-baseUrl/SSRF redesign;
- PGS policy logic.

Those are separate follow-up concerns.

==================================================
7. QUALITY GATE
   ==================================================

After changes:

1. run formatting/lint;
2. run affected unit tests;
3. run Gateway API tests;
4. run Admin API tests affected by integration-client provisioning;
5. run build/typecheck;
6. report exact commands and results;
7. inspect git diff and identify any unrelated branch drift.

Then provide a concise PR14 report with:
- files changed;
- timeout/cancellation flow;
- SERVICE_ONLY enforcement;
- tenant-binding enforcement;
- identity/provisioning changes;
- tests added/updated;
- remaining known risks.

Do not claim success for tests you could not execute.

If implementing real cancellation would require a surprisingly large provider-layer redesign, STOP and explain the existing abstraction problem before making a sweeping change. Complexity must buy an invariant.
