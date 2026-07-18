# ADR-010: Tenant Public Host Resolution

## Status

Accepted

## Decision

Public registration context is resolved in `admin-api` from an explicit, globally
unique tenant hostname mapping. Hostnames are normalized to lowercase DNS names
with ports and trailing dots removed. Wildcards and IP literals are unsupported.

If exactly one active tenant exists, it is the public default when no hostname
mapping resolves. With multiple active tenants, only an enabled exact mapping
resolves a tenant; there is no first-tenant fallback.

`LXP_REGISTRATION_ENABLED` remains a global kill switch. Per-tenant registration
settings are disabled by default and effective only when both switches are enabled.
`X-Forwarded-Host` is used only when `LXP_TRUST_PROXY=true`.

## Consequences

- New and migrated tenants start with registration disabled.
- Multi-tenant public deployments require explicit hostname configuration.
- This foundation does not create accounts or assign roles.
