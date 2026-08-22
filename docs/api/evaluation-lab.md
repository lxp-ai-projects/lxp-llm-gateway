# Evaluation Lab

The Evaluation Lab is an authenticated operator/developer diagnostic surface
for server-controlled structured evaluation profiles. It is not a PGS policy
workbench and does not produce allow/deny, grounding-state, capability, or
policy-publication decisions.

## Trust boundaries

```text
Admin Web operator session
  -> Admin API evaluation probe
  -> tenant-bound integration-client API key (server only)
  -> Gateway POST /api/v1/evaluations
  -> configured evaluator profile
```

The browser calls `POST /api/v1/admin/evaluation-probes` with only `profileId`
and profile input. It never receives or submits the integration API key,
provider credentials, provider/model selection, evaluator instructions, or a
tenant ID. The Admin API derives the tenant from the authenticated active-tenant
session and requires the existing `operator` or `tenant_admin` tenant role.

The Admin API selects a pre-provisioned `evaluation:invoke` integration key from
`LXP_ADMIN_EVALUATION_API_KEYS_JSON`, keyed by tenant UUID. It also sends the
expected tenant ID to the Gateway; the Gateway rejects the request if the key
resolves to a different tenant. This bridge does not bypass the M2M protection
of `/api/v1/evaluations`.

Credential lookup is behind `EvaluationServiceCredentialResolver`. The current
implementation reads the environment mapping, while the service boundary can be
replaced by a secret manager without changing probe or readiness behavior.

## Provisioning the Evaluation Lab identity

Provision a dedicated identity for each tenant whose operators may run probes:

1. In Admin Web, open the intended tenant and create an integration client
   named `admin-evaluation-lab`.
2. Select service-only identity and leave the optional default user empty.
3. Grant the client only `evaluation:invoke` and leave trusted forwarded
   identity disabled.
4. Create an API key with the same or a narrower scope and copy the secret when
   it is displayed. The stored key hash cannot be converted back into a secret.
5. Map the **same tenant UUID** to that secret in the Admin API environment:

   ```dotenv
   LXP_ADMIN_EVALUATION_API_KEYS_JSON='{"<tenant-uuid>":"<integration-api-key>"}'
   ```

6. Restart Admin API after changing its environment.

Separately, enable the profile's selected provider for the tenant and configure
a tenant-scoped credential. Platform fallback and personal BYOK are never
eligible for service-only evaluation.

Do not map a tenant UUID to a key created under another tenant. Do not reuse the
PGS `presence-grounding-service` client or key for the Evaluation Lab; the two
distinct identities make rotation, revocation, and audit attribution
independent.

To deprovision an identity, first remove its tenant entry from
`LXP_ADMIN_EVALUATION_API_KEYS_JSON` and restart Admin API. Then delete the API
key or integration client in Admin Web. Deleting a client permanently deletes
all of its API keys through the database foreign-key cascade; the UI requires
explicit confirmation for both destructive actions.

For local development, the browser request to port `3002` is intentional. The
request path is `admin-web:3003 -> admin-api:3002 -> gateway-api:3001`. PGS may
run on port `3004`, but it is a downstream consumer and is never called by an
Evaluation Lab probe. A `503` with code
`evaluation_service_identity_unavailable` means the active tenant has no entry
in `LXP_ADMIN_EVALUATION_API_KEYS_JSON`; it does not indicate a wrong PGS port.

`evaluation_service_authentication_failed` means the Admin API sent a key but
the Gateway returned `401`. Check that the key is active, belongs to the mapped
tenant, and belongs to an active integration client. A default user is not
required for this service-only evaluation route.
`evaluation_service_forbidden` means the identity authenticated but the client
or key does not grant `evaluation:invoke`.
`evaluation_provider_credential_unavailable` means authentication and scope
checks passed, but the active tenant has no active tenant credential for the
provider selected by the profile.
The `Provider Tokens` page manages user-scoped credentials and does not satisfy
a service-only evaluation. Configure the matching tenant-scoped credential
under `Tenants > Provider Configurations > <provider> > Tenant provider
credential`. The secret is stored in the encrypted Gateway credential
repository and is never returned by read APIs.
`evaluation_model_forbidden` means authentication and credentials passed, but
the selected model is denied by the tenant model-access policy.

Structured Evaluation does not resolve provider secrets from environment
variables or from a user's personal BYOK credential. `allowPlatformFallback`
is an established interactive-request policy and is ignored for service-only
evaluation. First-class platform credential ownership is deferred.

Provider selection happens in `gateway-api`, through
`LXP_EVALUATION_PGS_GROUNDING_PROVIDER` and
`LXP_EVALUATION_PGS_GROUNDING_MODEL`. The profile can use any configured
Gateway provider, including native OpenAI, Anthropic, xAI, Mistral, Google,
Groq, DeepSeek, Moonshot, or Z.ai integrations, or aggregators such as NanoGPT
and OpenRouter. A provider credential error concerns the selected provider for
the active tenant; it does not mean that PGS depends on NanoGPT.

The Lab and PGS call the same Gateway contract but are separate callers. The Lab
uses `LXP_ADMIN_EVALUATION_API_KEYS_JSON` in Admin API. PGS PR 14 uses
`EVALUATION_GATEWAY_API_KEYS_JSON` in PGS. Do not silently reuse one key for
both paths.

## Operations

- `GET /api/v1/admin/evaluation-profiles` returns safe allowlisted metadata plus
  tenant-specific readiness. The UI shows provider, model, credential path, and
  bounded failure reason before execution, and disables Run while not ready.
- `POST /api/v1/admin/evaluation-probes` executes a real evaluation and returns
  sanitized evidence, latency, timestamp, evaluation ID, and correlation ID.

The first profile is `pgs-grounding-v1`. Its form and presets exercise the
frozen structured input contract. Presets are example data only and do not
encode expected policy outcomes.

## Audit and privacy

The Admin API emits structured probe events containing operator UUID, tenant,
profile, request/evaluation ID, result category, latency, and timestamp. It does
not log the free-form candidate content, system instructions, API keys, raw
provider errors, or provider credentials. Test content can be sent to the
configured evaluator provider.

Use the response `x-request-id` to correlate the request across these events:

- `admin.http_request` with `received` confirms arrival on Admin API port 3002;
- `admin.evaluation_probe_gateway` with `started` confirms an outbound Gateway call;
- the same event with `received` records the bounded `upstreamStatus`;
- `admin.evaluation_probe` with `failed` records `resultCategory` and
  `failureCause` without copying the upstream body.

If a failed probe has no `admin.evaluation_probe_gateway` event, it failed
locally before outbound I/O. For example,
`evaluation_service_identity_unavailable` means the active tenant has no entry
in `LXP_ADMIN_EVALUATION_API_KEYS_JSON`.
