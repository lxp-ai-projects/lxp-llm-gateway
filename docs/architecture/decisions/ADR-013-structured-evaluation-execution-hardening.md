# ADR-013: Structured Evaluation Execution Hardening

## Status

Accepted

## Context

PR14 gives PGS and the Evaluation Lab a tenant-bound Structured Evaluation
route. A bearer key alone proves the integration client and tenant, but does not
prove that an intermediary intended to call for that tenant. A user-bound
technical client could also carry `evaluation:invoke`, which would blur the
service workload boundary. Finally, racing a provider request against a local
timer returns promptly but does not stop provider work or prevent late success
telemetry.

## Decision

`POST /api/v1/evaluations` accepts only an authenticated service-only
integration client with effective `evaluation:invoke` scope. It also requires
`X-Lxp-Expected-Tenant-Id`; authentication fails when the header is absent or
does not match the tenant resolved from the API key. The header is only a
confused-deputy guard and never supplies tenant authority.

The Evaluation Lab uses a dedicated `admin-evaluation-lab` integration client
and PGS uses `presence-grounding-service`. They must not share a client or API
key, which keeps revocation, rotation, and audit attribution independent.

The evaluation deadline owns an `AbortController`. Its signal is passed through
`GatewayService` and the provider-neutral `ProviderExecutionContext`, then
combined with each adapter's transport timeout at `fetch`. Adapters remain
responsible for provider-specific transport details. The Gateway checks for an
aborted signal after the provider response and before success audit or usage
telemetry, covering transports that ignore cancellation. Evaluation adds no
retry.

## Consequences

- Browser sessions and user-bound integration clients cannot substitute for a
  Structured Evaluation service identity.
- A bridge configured with a key from the wrong tenant fails closed even when
  the key itself is valid.
- Expired evaluations cancel cooperative provider transports and cannot produce
  a late successful response, success audit event, or success usage record.
- Existing non-evaluation calls keep their provider-owned timeout behavior when
  no external signal is supplied.
- The provider boundary remains generic; no provider implementation leaks into
  `gateway-api`.
- Readiness remains non-inferential and does not start a provider request.
