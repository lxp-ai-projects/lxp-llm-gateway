# Provider Credential Model

## Goal

The gateway must be easy to operate while remaining strict about privacy and secret handling.

Provider credentials are resolved dynamically from the encrypted Gateway
credential repository based on tenant, caller kind, and requested provider.

The stored secret material may represent a bearer token, an endpoint, or a small provider access configuration object depending on the provider.

## Core Concepts

### User

Represents the actor or account inside the platform.

Suggested minimum fields:

- `id`
- `email`
- `displayName`
- `status`
- `createdAt`
- `updatedAt`

### Role

Represents authorization posture within the control plane.

Suggested minimum fields:

- `id`
- `name`
- `description`

Suggested initial roles:

- `admin`
- `operator`
- `user`

### UserRole

Join model between users and roles.

Suggested minimum fields:

- `userId`
- `roleId`

### Provider

Represents a supported provider type.

Suggested minimum fields:

- `id`
- `providerId`
- `displayName`
- `status`

Suggested initial `providerId` values:

- `nanogpt`
- `openrouter`
- `ollama`
- `groq`
- `google`
- `xai`
- `openai`
- `anthropic`

### Provider Credential

The existing `UserProviderCredential` persistence entity stores provider access
owned either by a user or by a tenant. Its historical name does not change the
ownership semantics.

Suggested minimum fields:

- `id`
- `tenantId`
- `userId` (null for tenant ownership)
- `providerId`
- `scope` (`user` or `tenant`)
- `label`
- `encryptedSecret`
- `iv`
- `authTag`
- `keyVersion`
- `isActive`
- `lastUsedAt`
- `createdAt`
- `updatedAt`

Optional future fields:

- `maskedHint`
- `expiresAt`
- `revokedAt`
- `usagePolicyId`

`encryptedSecret` should be treated as encrypted provider access payload, not as "API key only".

Examples:

- NanoGPT: `{ "apiKey": "..." }`
- OpenRouter: `{ "apiKey": "...", "baseUrl": "https://openrouter.ai/api/v1" }`
- Ollama local: `{ "baseUrl": "http://127.0.0.1:11434/v1" }`
- Ollama cloud: `{ "baseUrl": "https://ollama.com", "apiKey": "..." }`
- Groq: `{ "apiKey": "...", "baseUrl": "https://api.groq.com/openai/v1" }`
- Google Gemini: `{ "apiKey": "...", "baseUrl": "https://generativelanguage.googleapis.com/v1beta/openai" }`
- xAI Grok: `{ "apiKey": "...", "baseUrl": "https://api.x.ai/v1" }`
- OpenAI: `{ "apiKey": "...", "baseUrl": "https://api.openai.com/v1" }`
- Anthropic Claude: `{ "apiKey": "...", "baseUrl": "https://api.anthropic.com" }`

The current runtime supports both Ollama access modes:

- local/runtime mode:
  - model listing via `/api/tags`
  - chat via `/v1/chat/completions`
- cloud mode:
  - model listing via `/api/tags`
  - chat via `/api/chat`

## Runtime Flow

### Admin Control Plane

1. An authorized user submits a provider secret through `admin-web`.
2. `admin-api` validates the request.
3. `admin-api` encrypts the secret using the active master key.
4. `admin-api` stores the encrypted credential record.
5. `admin-api` returns metadata only, never the raw secret.

### Gateway Data Plane

1. A caller sends a gateway request.
2. `gateway-api` resolves the tenant and caller kind.
3. User requests follow the established user/tenant policy. Service-only
   requests resolve only the active tenant credential for that provider.
4. `gateway-api` decrypts the secret in memory.
5. `gateway-api` invokes the provider adapter with the decrypted provider access configuration.
6. The secret is discarded after request execution.

## Resolution Rules

The first implementation should keep resolution explicit.

Current rule order:

1. request specifies `providerId`
2. gateway resolves the authenticated tenant and caller kind
3. service-only caller loads `scope=tenant`, `userId=null`, and the matching
   provider; it never borrows a user's credential
4. user caller follows the tenant provider credential policy
5. if no eligible credential exists, fail closed

Provider API-key environment variables are not the credential source for
service-only Structured Evaluation. Legitimate endpoint, timeout, and transport
configuration remains runtime configuration. First-class platform ownership is
deferred and must use the credential-storage abstraction when designed.

## Security Rules

- raw provider secrets must never be returned after creation
- raw provider secrets must never be logged
- decrypted secrets must stay server-side only
- frontend state must never store provider secrets after submission
- credential lookup must be authorization-aware

## Storage Guidance

The storage backend may begin in a simple persistence layer, but the model should already support:

- one user having multiple provider credentials
- one tenant having provider credentials for service workloads
- one provider existing across many users
- key rotation through `keyVersion`
- revocation and replacement

## Recommendation

Use Postgres as the long-term source of truth for users, roles, and provider credentials.

Redis or Valkey may still be used for sessions and short-lived operational state, but not as the final durable home for encrypted provider credentials.
