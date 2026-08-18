# ADR-011: Registration Email Verification

## Status

Accepted

## Decision

Public registration email verification is a dedicated `admin-api` module. It resolves the tenant from the accepted public-host policy and delivers through an explicitly selected global transport: manually configured SMTP (the default) or MailerSend API. No user, membership, role, or browser session is created.

Challenges persist the tenant id, HMAC email lookup hash, HMAC code digest, expiry and lifecycle counters. Email addresses, codes, and completion tokens are never persisted. The completion token is random, stored only as a digest, and can be consumed once.

Redis enforces bounded request, resend, verification and IP limits. Email verification is advertised only when registration is enabled for the resolved tenant and the selected delivery provider is ready.

`LXP_REGISTRATION_ENABLED` is a deployment-level kill switch. Tenant settings
cannot override it; the admin UI exposes its non-secret state and explains how
to temporarily close registration globally.

## Consequences

- SMTP or MailerSend credentials remain deployment secrets, not tenant provider credentials.
- Transport selection does not silently fall back; a MailerSend outage fails delivery instead of attempting SMTP.
- Resend requires the email again, avoiding durable cleartext destination storage.
- Account creation is deferred to the following registration PR.
