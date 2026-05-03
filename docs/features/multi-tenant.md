# LXP LLM Gateway — Multi-Tenant Control Plane Hardening Plan

## Goal

Strengthen the existing multi-tenant foundation by adding explicit tenant provider configuration, model access rules, usage records, and enforceable tenant policies/limits.

The current project already has:
- tenants
- tenant memberships
- active tenant auth context
- super admin global role
- encrypted provider credentials with tenant/user scope
- tenant-aware admin surfaces

This plan should be implemented in small, testable PRs.

---

## Phase 1 — Fix tenant/BYOK credential uniqueness

### Objective
Prevent duplicate tenant-scoped provider credentials when `user_id` is null.

### Tasks
1. Add a migration replacing or complementing the current uniqueness strategy for `user_provider_credentials`.
2. Add partial unique indexes:
  - Tenant-scoped credentials:
    - unique on `(tenant_id, provider_id, label)`
    - where `scope = 'tenant' AND user_id IS NULL`
  - User-scoped credentials:
    - unique on `(tenant_id, user_id, provider_id, label)`
    - where `scope = 'user' AND user_id IS NOT NULL`
3. Add tests for:
  - duplicate tenant credential rejected
  - duplicate user credential rejected
  - same provider/label allowed across different tenants
  - same provider/label allowed for different users in same tenant

### Acceptance Criteria
- No duplicate active tenant-scoped credential can be inserted.
- Existing user-scoped BYOK behavior remains valid.
- Migration is reversible.

==

## Phase 2 — Add Tenant Provider Configurations

### Objective
Create a first-class configuration layer for provider behavior per tenant.

### Proposed entity
`TenantProviderConfigurationEntity`

Fields:
- `id`
- `tenantId`
- `providerId`
- `enabled`
- `defaultTextModel`
- `defaultImageModel`
- `credentialMode`
  - `platform_default`
  - `tenant_byok`
  - `user_byok`
  - `hybrid`
- `preferUserCredentials`
- `allowPlatformFallback`
- `allowTenantFallback`
- `createdAt`
- `updatedAt`

### Resolution logic
Provider credential resolution should follow:

1. If tenant policy says `user_byok` or `hybrid + preferUserCredentials`, try active user credential.
2. If unavailable and tenant fallback is allowed, try active tenant credential.
3. If unavailable and platform fallback is allowed, use platform/env/provider-level credential.
4. If no credential is available, reject with a clear 403/422-style domain error.

### API
Add admin endpoints:
- `GET /admin/tenants/:tenantId/provider-configurations`
- `PUT /admin/tenants/:tenantId/provider-configurations/:providerId`
- `POST /admin/tenants/:tenantId/provider-configurations/:providerId/test`

### UI
Add a “Provider configurations” tenant admin screen:
- provider enabled/disabled
- default text model
- default image model
- credential mode
- BYOK priority
- fallback toggles
- test credential button

### Tests
- tenant config can be created/updated
- disabled provider is rejected
- BYOK preferred path chooses user credential first
- tenant credential fallback works
- platform fallback can be disabled

==

## Phase 3 — Add Model Access Rules

### Objective
Allow each tenant to control which models/capabilities are available.

### Proposed entity
`TenantModelAccessRuleEntity`

Fields:
- `id`
- `tenantId`
- `providerId`
- `modelPattern`
- `capability`
  - `text`
  - `image`
  - `stt`
  - `tts`
  - `embedding`
- `effect`
  - `allow`
  - `deny`
- `maxInputTokens`
- `maxOutputTokens`
- `maxImagesPerRequest`
- `maxResolution`
- `priority`
- `createdAt`
- `updatedAt`

### Enforcement
Before any gateway call:
1. Resolve active tenant.
2. Resolve provider configuration.
3. Check model access rules.
4. Reject denied model/capability.
5. Apply max token/image/resolution limits.

### API
- `GET /admin/tenants/:tenantId/model-access-rules`
- `POST /admin/tenants/:tenantId/model-access-rules`
- `PUT /admin/tenants/:tenantId/model-access-rules/:ruleId`
- `DELETE /admin/tenants/:tenantId/model-access-rules/:ruleId`

### UI
Add “Model access rules” screen:
- provider
- model pattern
- capability
- allow/deny
- limits
- priority/order

### Tests
- allow rule permits model
- deny rule blocks model
- deny overrides allow when priority says so
- capability-specific rules work
- tenant isolation is enforced

==

## Phase 4 — Add Usage Records

### Objective
Create a durable usage ledger for analytics, billing, debugging, and quotas.

### Proposed entity
`UsageRecordEntity`

Fields:
- `id`
- `requestId`
- `tenantId`
- `userId`
- `integrationClientId`
- `apiKeyId`
- `providerId`
- `model`
- `capability`
- `credentialScopeUsed`
  - `platform`
  - `tenant`
  - `user`
- `inputTokens`
- `outputTokens`
- `totalTokens`
- `imageCount`
- `estimatedCostUsd`
- `latencyMs`
- `status`
  - `success`
  - `error`
  - `blocked_by_policy`
  - `blocked_by_quota`
- `errorCode`
- `createdAt`

### Runtime behavior
Every gateway request should create a usage record, including failures caused by policy/quota enforcement.

### API
- `GET /admin/tenants/:tenantId/usage`
- `GET /admin/tenants/:tenantId/usage/summary`
- `GET /admin/tenants/:tenantId/usage/by-provider`
- `GET /admin/tenants/:tenantId/usage/by-model`

### UI
Use the existing Analytics section:
- usage by provider
- usage by model
- usage by user
- cost estimate
- blocked requests
- latency/error rate

### Tests
- successful request creates usage record
- blocked request creates usage record
- usage is scoped to tenant
- super-admin can view all tenants
- tenant admin can only view own active tenant

==

## Phase 5 — Add Tenant Policies and Limits

### Objective
Protect costs, abuse, and operational stability.

### Proposed entity
`TenantPolicyEntity`

Fields:
- `tenantId`
- `monthlyBudgetUsd`
- `dailyRequestLimit`
- `monthlyRequestLimit`
- `requestsPerMinute`
- `tokensPerMinute`
- `monthlyTokenLimit`
- `imageRequestsPerMonth`
- `maxInputTokens`
- `maxOutputTokens`
- `allowPromptLogging`
- `allowResponseLogging`
- `retentionDays`
- `createdAt`
- `updatedAt`

### Enforcement points
- Before provider dispatch:
  - check tenant status
  - check provider enabled
  - check model access
  - check rate limit
  - check monthly budget
  - check token/image limits
- After provider response:
  - record usage
  - update aggregates if needed

### Suggested default policy
For development/demo tenants:
- monthly budget: configurable, default low
- requests per minute: 60
- tokens per minute: 100k
- image requests per month: configurable
- prompt logging: false by default unless explicitly enabled
- retention: 30 days

### API
- `GET /admin/tenants/:tenantId/policies`
- `PUT /admin/tenants/:tenantId/policies`

### UI
Add “Policies & limits” tenant admin screen:
- budget
- rate limits
- token limits
- image limits
- logging/retention toggles

==

## Phase 6 — Integration clients and API keys alignment

### Objective
Make OpenWebUI and future external clients tenant-aware and policy-aware.

### Tasks
1. Ensure every integration client is bound to a tenant.
2. Ensure API keys are tenant-scoped.
3. Add optional scopes:
  - `chat:completion`
  - `image:generate`
  - `image:edit`
  - `models:list`
  - `usage:read`
4. Apply model access rules and tenant policies to integration-client traffic.
5. Record usage with `integrationClientId` and/or `apiKeyId`.

### Tests
- OpenWebUI can only see models allowed for its tenant.
- API key from Tenant A cannot access Tenant B.
- API key with text-only scope cannot generate images.
