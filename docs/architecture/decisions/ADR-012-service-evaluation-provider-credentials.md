# ADR-012: Provider Credentials for Service Evaluations

## Status

Accepted

## Context

Structured Evaluation is invoked by a tenant-bound integration client whose
principal has no user identity. The Gateway already stores encrypted provider
access for `USER` and `TENANT` owners, while an older interactive-request path
can resolve a deployment-level provider access value from the environment.

Using that environment path for Structured Evaluation would create two secret
sources, let readiness depend on process configuration, and blur the boundary
between the PGS-to-Gateway integration credential and the Gateway-to-provider
credential.

## Decision

For a service-only Structured Evaluation request, the server-controlled profile
first resolves the provider and model. `ProviderCredentialService` then resolves
only an active encrypted `TENANT` credential for that tenant and provider.

The resolver must fail closed when that credential is absent. It must not read a
`USER` credential, infer a user, use the integration-client creator, or use a
provider API-key environment variable. Readiness and execution call this same
resolver.

The PGS integration credential remains separate: it authenticates the
tenant-bound integration client and delegates `evaluation:invoke`; it is not a
model-provider credential.

Existing interactive user credential precedence and its legacy, explicitly
configured platform fallback are outside this PR14 correction and remain
unchanged. Structured Evaluation ignores that fallback even when
`allowPlatformFallback` is enabled.

Provider endpoint, timeout, feature, and transport settings remain valid runtime
configuration. First-class `PLATFORM` credential ownership is deferred; if it is
introduced, it must use the credential repository or its secret-store
abstraction rather than equating platform ownership with environment variables.

## Consequences

- Service evaluations are tenant-isolated and cannot borrow personal BYOK.
- Changing a profile's provider changes the tenant credential lookup without a
  PGS or request-contract change.
- Missing provider access produces
  `evaluation_provider_credential_unavailable`, not an authentication failure.
- Operators create, rotate, disable, and delete tenant credentials through the
  control plane; only sanitized metadata returns to the browser.
- No database migration or provider-specific branch is required.
- The legacy interactive platform fallback remains technical debt and is not a
  supported credential source for service workloads.
