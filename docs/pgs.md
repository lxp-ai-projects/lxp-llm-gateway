# PR14 — Service-only Integration Client Identity

Repository:

```text
lxp-llm-gateway
```

Current branch:

```text
feature/pgs-integration
```

Perform a focused architectural correction to the Integration Client identity model discovered while configuring the `pgs` machine-to-machine client.

Do not start unrelated work.

Do not modify the `presence-grounding-service` repository in this task.

---

# Context

The new PGS integration uses:

```text
POST /api/v1/evaluations
```

with a machine-to-machine Integration Client and the scoped permission:

```text
evaluation:invoke
```

The current Admin UI nevertheless requires an Integration Client to have a:

```text
Default user
```

when forwarded user identity is disabled.

For PGS this produces a configuration conceptually equivalent to:

```text
Integration client: pgs
Tenant: lxp-internal
Forwarded identity: disabled
Default user: Patrick
Scope: evaluation:invoke
```

This is not the desired identity model for a pure service-to-service caller.

PGS is not acting as Patrick.

It is acting as:

```text
SERVICE: pgs
```

inside:

```text
TENANT: lxp-internal
```

with:

```text
SCOPE: evaluation:invoke
```

A human user may or may not exist for a particular request.

---

# 1. Audit before changing the model

Before modifying the schema, inspect how Integration Client identity currently flows through:

```text
API-key authentication
tenant resolution
request principal/context
policy evaluation
model-access rules
quotas
provider credential resolution
usage accounting
audit events
telemetry
forwarded user handling
default-user fallback
Admin API
Admin Web
database schema / Prisma
```

Identify exactly why `defaultUserId` is currently required.

Determine whether the requirement is:

```text
database-level
DTO validation
domain invariant
policy-engine assumption
audit assumption
provider-routing assumption
UI-only validation
```

or a combination.

Reuse existing principal/actor abstractions where possible.

Do not create a parallel identity system if an equivalent distinction already exists.

---

# 2. Desired identity semantics

The Gateway should distinguish these concepts:

```text
Tenant
Calling principal
Optional delegated/end-user identity
```

Conceptually:

```text
tenant = lxp-internal

caller principal
  type = SERVICE
  integrationClientId = pgs

delegated user
  none
```

For another Integration Client, the model may instead be:

```text
tenant = customer-a

caller principal
  type = SERVICE
  integrationClientId = application-a

delegated user
  user-123
```

These identities must not be conflated.

---

# 3. Service-only Integration Clients

Allow an Integration Client to operate in a true service-only mode:

```text
Client: pgs
Tenant: lxp-internal
Forwarded identity: disabled
Default user: none
Scopes:
  evaluation:invoke
```

The authenticated Integration Client itself becomes the authoritative caller principal.

Do not create or require a synthetic human user merely to satisfy an old invariant.

Do not automatically impersonate the tenant owner, creator, administrator or current browser operator.

---

# 4. Preserve existing identity modes

Do not remove useful existing behavior.

The Gateway should continue to support, where currently applicable:

```text
A. Service-only identity
   integration client is the caller
   no user required

B. Forwarded/delegated user identity
   service caller + validated user context

C. Default-user fallback
   service caller + configured fallback user
```

The exact UI/domain terminology may follow existing conventions.

Backward compatibility for existing Integration Clients using a default user should be preserved unless an existing behavior is demonstrably unsafe.

---

# 5. Caller vs delegated user

If the current request context supports it cleanly, model both independently.

Conceptually:

```ts
caller = {
  type: 'SERVICE',
  integrationClientId: 'pgs'
};

delegatedUser = undefined;
```

or:

```ts
caller = {
  type: 'SERVICE',
  integrationClientId: 'customer-app'
};

delegatedUser = {
  userId: 'user-123'
};
```

Do not require these exact types or names.

Reuse the repository's canonical principal/context model.

The important invariant is:

> The technical caller must remain attributable even when an end-user identity exists.

---

# 6. PGS expected behavior

For the `pgs` Integration Client:

```text
caller principal = service / pgs
tenant = configured tenant
delegated user = none
default user = none
scope = evaluation:invoke
```

The request should successfully reach:

```text
POST /api/v1/evaluations
```

without requiring a human user.

---

# 7. Authorization remains scope-based

Do not weaken authorization.

Service-only identity does NOT mean anonymous identity.

The request must still require:

```text
valid Integration Client credential
active Integration Client
active API key/technical credential
matching tenant context
evaluation:invoke
```

Expected:

```text
missing/invalid credential → 401
valid client without scope → 403
service-only client with evaluation:invoke → allowed
```

---

# 8. Tenant context remains mandatory

A service-only Integration Client still belongs to an authoritative tenant.

Do not allow:

```text
no user
→ no tenant
```

The tenant must continue to drive relevant:

```text
provider configuration
credentials
quotas
policies
model access
audit
usage
```

according to the existing architecture.

---

# 9. Policy semantics without a user

Audit all policy/model-access logic that assumes:

```text
userId !== null
```

Define explicit service-only behavior.

Preferred principle:

```text
tenant rules
+ integration-client/service rules
```

apply normally.

User-specific overrides should simply not participate when there is no delegated/default user.

Do not fabricate a user just so user override logic can execute.

If an existing policy explicitly requires user context and cannot safely evaluate without it, fail closed or report the configuration problem according to existing policy semantics.

Do not silently bypass security rules.

---

# 10. Model access rules

Audit `Model Access Rules` specifically.

A service-only PGS client must have a deterministic authorization path.

Do not implicitly inherit:

```text
Patrick's personal model access
```

merely because Patrick created/configured the client.

Where existing model access is user-oriented, determine the smallest clean extension required for technical clients.

Prefer existing tenant/client policy layers if already available.

Avoid a broad policy-engine rewrite unless genuinely necessary.

---

# 11. Quotas and accounting

Usage generated by a service-only client should remain attributable.

Prefer attribution equivalent to:

```text
tenant: lxp-internal
integrationClient: pgs
credential/key: <opaque identifier>
```

not:

```text
user: Patrick
```

unless an actual delegated/default user exists.

Preserve existing tenant quotas.

If user-specific quotas do not apply because there is no user, document the behavior clearly.

---

# 12. Audit events

Audit logs must make the caller identity truthful.

For a PGS service invocation, prefer safe semantics equivalent to:

```text
actorType: SERVICE
actorId: pgs
tenantId: lxp-internal
operation: evaluation.invoke
```

rather than:

```text
actor: Patrick
```

Do not erase service attribution when a delegated user exists.

Ideally future audit data can answer separately:

```text
Who called the Gateway?
On behalf of whom, if anyone?
```

---

# 13. Telemetry

Where existing telemetry includes actor/user identifiers, update it so a service-only call remains traceable without inventing a user.

Useful metadata may include:

```text
tenant
integration client ID
credential/key ID or safe hint
scope/operation
profile ID
correlation ID
```

Do not expose API keys.

---

# 14. Database/schema changes

Audit whether `defaultUserId` is currently non-nullable.

If necessary, make it nullable.

Use the repository's migration conventions.

Preserve existing rows.

Do not rewrite existing Integration Client identity configuration unless required.

Existing:

```text
defaultUserId = Patrick
```

must remain configured after migration.

New/existing clients should be able to set:

```text
defaultUserId = null
```

when using service-only identity.

---

# 15. Domain validation

Update validation so this becomes valid:

```text
forwarded identity: disabled
default user: none
service identity: enabled/inherent
```

Do not replace one artificial requirement with another.

Reject genuinely contradictory configurations where applicable.

For example, if the existing model has mutually exclusive identity modes, validate them explicitly.

---

# 16. Admin API

Update Integration Client create/update/read DTOs as needed.

The API must support:

```text
defaultUserId: null
```

for service-only clients.

Do not expose hidden fallback behavior.

Responses should make the effective identity mode understandable.

If useful within current API conventions, expose a normalized field such as:

```text
identityMode
```

with values conceptually equivalent to:

```text
SERVICE_ONLY
FORWARDED_USER
DEFAULT_USER
```

but only add this if it simplifies and accurately represents the existing domain.

Do not add unnecessary duplicate state.

---

# 17. Admin Web UX

Update the Integration Client UI so `Default user` is not mandatory for a technical service.

The PGS configuration should be representable as:

```text
Identity

Service principal: pgs
Forwarded identity: disabled
Default user: None
```

or an equivalent clear presentation.

---

# 18. Configuration UX

Prefer an explicit identity choice if it fits the existing UI.

Conceptually:

```text
Identity mode

○ Service identity only
○ Forward user identity
○ Default user fallback
```

Then reveal only relevant controls.

Example:

```text
Service identity only

Service principal
pgs

No human user is associated with requests from this client.
```

Do not force the operator to select a user.

---

# 19. Explanatory copy

Add concise UX help explaining the distinction.

Example:

> Service-only clients authenticate as the integration client itself. No default human user is required.

And for delegated/forwarded identity:

> When enabled, validated user identity may supplement the service caller context.

Avoid language implying that the Integration Client *becomes* the user.

---

# 20. Existing clients

Verify existing clients continue to behave exactly as configured.

Regression cases:

```text
existing client + default user
→ still uses configured fallback

existing forwarded-user client
→ forwarding behavior preserved

new service-only client
→ no user required
```

No silent identity-mode migration.

---

# 21. Evaluation Lab

Verify the Evaluation Lab still works after this change.

The Lab's server-side invocation path should be able to select/use the `pgs` Integration Client without relying on Patrick as a default user.

Target:

```text
Admin Web
→ Admin API
→ service credential for pgs
→ Gateway API
→ evaluation:invoke
→ pgs-grounding-v1
```

The browser operator is still relevant for the **Admin API audit event**, but must not become the downstream Gateway service principal merely because they clicked "Run evaluation".

Preserve both audit layers where appropriate:

```text
Operator Patrick initiated probe
        ↓
Admin API

Service pgs invoked evaluation
        ↓
Gateway data plane
```

---

# 22. Security invariants

The change must not permit:

```text
service client → anonymous request
service client → arbitrary tenant
service client → arbitrary user impersonation
service client → missing scope bypass
service client → admin permissions by default
service client → inherited creator privileges
```

A service principal has only the permissions/scopes explicitly assigned to that Integration Client/key.

---

# 23. No synthetic-user workaround

Explicitly do NOT solve this by automatically creating:

```text
pgs-service@example.internal
```

or another fake user record.

Service identities should be first-class technical principals.

A synthetic user would preserve the original modeling problem and contaminate:

```text
audit
quotas
membership
analytics
user administration
```

---

# 24. Tests — domain

Add tests for:

```text
service-only integration client is valid
default user may be null
existing default-user client remains valid
forwarded-user mode remains valid
invalid contradictory identity configuration rejected
```

---

# 25. Tests — authentication/authorization

Cover:

```text
service-only client + valid key + evaluation:invoke → success
service-only client without required scope → 403
disabled client → rejected
invalid key → 401
tenant mismatch → rejected
```

---

# 26. Tests — policy/model access

Verify:

```text
tenant policy still applies
client/service policy still applies where supported
user override is absent when no user exists
no creator/default admin identity is implicitly substituted
```

If policy cannot safely evaluate without a user, verify fail-closed behavior.

---

# 27. Tests — audit/accounting

Verify a service-only PGS request is attributed to:

```text
integration client / service
```

rather than the Integration Client creator or unrelated human user.

If delegated/default-user identity exists, verify both caller and user context remain distinguishable where supported.

---

# 28. Tests — Admin API/Web

Add/update tests covering:

```text
create service-only client without default user
edit existing client and remove default-user fallback where valid
render "None" / service-only identity
default user selector hidden/optional for service-only mode
existing default-user UX still works
forwarded identity UX still works
```

---

# 29. Migration validation

If a database migration is required:

```text
existing data preserved
migration up succeeds
fresh database succeeds
Quickstart succeeds
VPS Compose succeeds
```

Do not introduce destructive migration behavior.

---

# 30. Documentation

Update the Integration Client/security architecture documentation.

Document three distinct concepts:

```text
service caller
delegated user
default-user fallback
```

Make explicit:

> A machine-to-machine Integration Client does not require a human user. The Integration Client itself is an authenticated technical principal.

Document PGS as the reference example:

```text
PGS
→ service principal: pgs
→ tenant scoped
→ evaluation:invoke
→ no default user required
```

---

# 31. Non-goals

Do NOT:

```text
redesign all Gateway identity
replace API-key authentication
add OAuth client_credentials unless separately required
change PGS code
add SCIM
build service-account user records
change provider credential architecture
redesign tenant membership
start unrelated PR15 work
```

Keep this a focused correction to first-class service identity support.

---

# Acceptance criteria

* [ ] Integration Clients can operate without a default human user.
* [ ] `pgs` can be configured as a service-only principal.
* [ ] `evaluation:invoke` remains mandatory.
* [ ] Tenant context remains authoritative.
* [ ] No fake/synthetic user is required.
* [ ] Existing default-user clients remain compatible.
* [ ] Existing forwarded-user behavior remains compatible.
* [ ] User-specific overrides are not implicitly applied without a user.
* [ ] No creator/admin identity is silently substituted.
* [ ] Audit identifies `pgs` as the technical caller.
* [ ] Usage/accounting remain attributable without a human user.
* [ ] Evaluation Lab works with service-only PGS identity.
* [ ] Admin API supports the service-only configuration.
* [ ] Admin Web clearly represents service-only identity.
* [ ] Security regression tests cover tenant/scope/impersonation boundaries.
* [ ] Database migration, if required, preserves existing data.
* [ ] lint passes.
* [ ] tests pass.
* [ ] build passes.
* [ ] Quickstart/Compose validation remains green.
* [ ] VPS Compose validation remains green.
* [ ] No PGS code was modified.

# Completion report

Report:

1. why `defaultUserId` was previously required;
2. existing identity abstractions reused;
3. final service-principal semantics;
4. database/schema changes;
5. migration details;
6. request principal/context changes;
7. policy/model-access behavior without a user;
8. quota/accounting behavior;
9. audit behavior;
10. Admin API changes;
11. Admin Web changes;
12. Evaluation Lab regression result;
13. backward compatibility with existing clients;
14. security tests added;
15. lint result;
16. test result;
17. build result;
18. Compose validation;
19. remaining identity-model debt, if any.
