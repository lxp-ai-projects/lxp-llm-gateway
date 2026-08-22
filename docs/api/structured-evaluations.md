# Structured Evaluation API

`POST /api/v1/evaluations` executes a server-controlled structured evaluator
profile. It returns validated evidence and never makes downstream policy,
authorization, grounding, or capability decisions.

## Authorization

The route accepts only a tenant-scoped integration-client API key:

```http
Authorization: Bearer <integration-client-api-key>
X-Lxp-Expected-Tenant-Id: <tenant-uuid>
```

The authenticated integration client must use service-only identity, and its
effective client/key scope must include `evaluation:invoke`. The expected-tenant
header is mandatory and must equal the tenant resolved from the API key.
Missing or invalid credentials, a missing header, or a tenant mismatch returns
`401`; a user-bound integration identity or valid service identity without the
scope returns `403`. Tenant authority comes only from the authenticated client;
the header is a confused-deputy guard and cannot select or override a tenant.

Client scopes are a capability ceiling. API-key scopes are an explicit delegated
subset, and the effective scopes are their intersection. Omitting scopes while
creating a key copies the current client scopes; an explicit empty array grants
no capability. Reducing client scopes immediately reduces every existing key.
Expanding client scopes does not expand a key that already has explicit scopes.
The `1713000000020-ReconcileIntegrationApiKeyScopes` migration copies the client
ceiling into historical empty-scope keys and intersects historical key scopes
with their client ceiling. Its down migration is intentionally non-destructive
because prior scope values cannot be reconstructed safely.

For PGS, create a service-only integration client in the intended tenant, leave
the default user empty, grant only `evaluation:invoke`, and create a key with
the same or narrower scope. Configure the resulting key in the PGS secret
store; never commit it.

## PGS provisioning and runtime configuration

PGS is a downstream service-to-service caller. Its Admin API being healthy does
not prove that its Gateway evaluation identity is configured or authorized.

Provision the PGS identity in the Gateway control plane:

1. Select the tenant whose policies, quotas, provider configuration, and usage
   attribution must apply to PGS evaluations.
2. Create a dedicated integration client such as `presence-grounding-service`.
3. Select service-only identity. Do not bind a default user: PGS authenticates
   as the integration client itself, not as the operator who configured it.
4. Grant only `evaluation:invoke`. Keep trusted forwarded identity disabled;
   PGS must not supply a caller-controlled user or tenant identity.
5. Create a dedicated API key, copy its one-time secret into the PGS secret
   store, and define an expiry/rotation policy appropriate for the deployment.

PGS PR 14 implements these concepts through its validated runtime variables:

```dotenv
EVALUATION_PROVIDER=lxp-llm-gateway
EVALUATION_GATEWAY_BASE_URL=http://127.0.0.1:3001
EVALUATION_GATEWAY_API_KEYS_JSON={"<tenant-uuid>":"<dedicated-pgs-integration-key>"}
EVALUATION_GATEWAY_TIMEOUT_MS=35000
```

The PGS adapter fixes the route to `/api/v1/evaluations`, schema version to `1`,
and profile to `pgs-grounding-v1`; these are not runtime execution controls.
Its timeout should be at least as large as the bounded Gateway profile timeout.

When PGS runs in Docker, use the reachable Gateway service name rather than
`localhost`; `localhost` inside the PGS container refers to that container.
Send the key only as `Authorization: Bearer <integration-api-key>`. Do not send
a tenant ID as authority in the body, and do not configure provider API keys,
provider names, model names, prompts, or inference parameters in PGS.

`LXP_ADMIN_EVALUATION_API_KEYS_JSON` is exclusively the Admin API bridge used by
the Evaluation Lab. `EVALUATION_GATEWAY_API_KEYS_JSON` is exclusively PGS
runtime configuration. Use distinct keys and distinct integration clients,
named `admin-evaluation-lab` and `presence-grounding-service`, so rotation,
revocation, and audit attribution remain independent.
Neither secret is ever shared with browser code.

The Gateway deployment separately owns the evaluator profile configuration
shown below. PGS cannot compensate for a missing Gateway provider/model profile.

### PGS authorization troubleshooting

- `401`: the key is missing, unknown, inactive, expired, bound to a disabled
  client, or belongs to a different expected tenant.
- `403` with `evaluation_service_forbidden`: the authenticated client and key
  do not grant `evaluation:invoke`.
- `403` with `evaluation_model_forbidden`: the selected model is denied by the
  tenant model-access policy.
- `503` before a Gateway evaluation audit event: the calling bridge or PGS
  client is not configured to send its service identity.
- `503` with `evaluation_provider_credential_unavailable`: no active
  tenant-scoped credential exists for the selected provider. Configure it under
  `Tenants > Provider Configurations > <provider> > Tenant provider credential`.
- Other `503` responses after Gateway authentication mean that the evaluator
  profile/provider is not configured or the provider is unavailable. Inspect
  the normalized error code and Gateway evaluation audit event rather than
  treating PGS health as proof of evaluator readiness.

### Contract compatibility with PGS PR 14

The Gateway and PGS contracts agree on the strict v1 request and response
envelopes. PGS sends the authenticated tenant only through
`X-Lxp-Expected-Tenant-Id`; the request body cannot select a tenant, provider,
model, prompt, tool, or inference parameter. Both sides validate the returned
signal definitions, confidence bounds, ambiguity, contradiction, and follow-up
fields. PGS then stamps its own evaluator provenance and remains the policy
decision point; the Gateway returns evidence only.

PGS normalizes Gateway failures into its bounded provider failure vocabulary:
identity unavailable, authentication failed, authorization failed, rate
limited, timeout, unavailable, invalid response, or unsupported contract. It
does not persist or log raw Gateway/provider bodies, answer text, or credentials.

## Envelope

```json
{
  "schemaVersion": "1",
  "profileId": "pgs-grounding-v1",
  "input": {
    "questionVersionId": "question-v1",
    "rubric": {
      "id": "rubric-v1",
      "version": 1,
      "guidance": "Assess the answer against the supplied signals."
    },
    "answerText": "Candidate answer text",
    "evidenceReference": {
      "kind": "ASSESSMENT_ANSWER",
      "referenceId": "answer-1"
    },
    "allowedSignals": []
  }
}
```

The body cannot select a provider, model, base URL, prompt, API key, inference
parameters, tools, or output schema. Unknown fields and unsupported versions or
profiles are rejected. Profile input and output are capped at 64 KiB.

A successful response is:

```json
{
  "schemaVersion": "1",
  "profileId": "pgs-grounding-v1",
  "profileVersion": "1",
  "evaluationId": "opaque-request-id",
  "evidence": {
    "observations": [],
    "ambiguity": {
      "score": 1,
      "reasons": ["INSUFFICIENT_CONTEXT"]
    },
    "contradiction": { "detected": false },
    "followUpRecommended": true
  }
}
```

Evidence is strict: unknown signals, altered signal definitions, non-finite or
out-of-range scores, malformed JSON, extra fields, and authoritative fields such
as `allow`, `deny`, `grounded`, or capability mutations fail the request.
The versioned golden fixtures live under
`packages/contracts/test/fixtures/structured-evaluations/v1` and cover a valid
request, valid response, authoritative output, invalid schema, and invalid
signal. `evaluationId` is 1–128 characters and uses only letters, digits,
period, underscore, colon, at-sign, or hyphen.

## Readiness

`POST /api/v1/evaluations/readiness` uses the same tenant-bound service identity
and requires `evaluation:invoke`, but does not invoke a model. It returns only
safe metadata: whether the profile is configured, provider and model, tenant
provider status, model policy status, credential path, aggregate readiness, and
a bounded reason. Service-only evaluation currently reports `tenant` or `null`;
the broader enum remains wire-compatible. It never returns a secret.
The integration-client self-test remains identity-only and is not proof that an
evaluation profile is ready.

The stable evaluation error vocabulary is exported as
`EVALUATION_ERROR_CODES` from `@lxp/contracts`. Credential absence is a typed
domain failure internally and is translated only at the evaluation boundary to
`503 evaluation_provider_credential_unavailable`; it is not an authorization
`403`.

## Profile Configuration

The first profile is configured only on `gateway-api`:

```dotenv
LXP_EVALUATION_PGS_GROUNDING_PROVIDER=openai
LXP_EVALUATION_PGS_GROUNDING_MODEL=gpt-5-mini
LXP_EVALUATION_PGS_GROUNDING_TIMEOUT_MS=30000
LXP_EVALUATION_PGS_GROUNDING_MAX_OUTPUT_TOKENS=1500
```

The provider is not coupled to PGS or NanoGPT. It may be any provider registered
behind the Gateway provider seam, including native OpenAI, Anthropic, xAI,
Mistral, Google, Groq, DeepSeek, Moonshot, or Z.ai integrations, as well as
NanoGPT, OpenRouter, or Ollama. The model value must be a model identifier
understood by the selected provider adapter.

The selected provider must already be enabled for the authenticated tenant and
the selected model must pass the existing tenant model-access and quota rules.
Service-only evaluations never participate in user credential overrides.
They require an active tenant-scoped credential from the encrypted Gateway
credential repository for the provider resolved by the profile. User BYOK and
environment-backed platform fallbacks are ignored, and absence fails closed.

Use `Test client` in the tenant's Integration Clients tab to validate the PGS
technical identity and `evaluation:invoke` scope independently. A successful
self-test proves the Gateway authentication path only. Evaluation remains
unavailable until the selected profile provider has an allowed model and a
tenant credential.

Two unrelated credentials are involved. The PGS integration-client key
authenticates PGS to the Gateway and carries `evaluation:invoke`. The tenant
provider credential authenticates the Gateway to the resolved model provider.
Neither credential substitutes for the other. First-class platform credential
ownership is deferred and is not represented by provider API-key environment
variables for PR-14.

The profile owns its system instructions and requests JSON-only evidence. The
Gateway also supplies a server-controlled canonical JSON output constraint to
the provider seam. Supporting adapters translate that constraint into their
provider transport without exposing provider-specific `response_format`
details to callers. The Gateway then parses and validates the complete response
against the profile schema; it never accepts partial evidence. Existing provider
adapters own their transport timeout. The evaluation layer adds a bounded
deadline and does not add retries, preventing retry multiplication with PGS or
provider SDKs. On expiry, its abort signal crosses the provider seam and cancels
the underlying fetch where supported. The Gateway checks the signal again after
provider completion, so a transport that ignores cancellation cannot record or
return a late success. Timers are cleared after either success or failure.

## Privacy And Failure

Only the profile input is sent to the selected model. Logs contain request ID,
tenant/service identity, profile, provider/model, latency and failure category,
but not answer text, rubric guidance, prompts, credentials, or provider bodies.

Provider authentication, rate-limit, timeout, network, and availability failures
are normalized into Gateway errors. No failure produces fabricated low-risk or
permissive evidence. Evaluation dispatch terminates at the provider adapter and
cannot call PGS, so the Gateway-to-PGS recursion path is absent.
