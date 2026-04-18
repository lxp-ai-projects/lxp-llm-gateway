# Provider Credential Model

## Goal

The gateway must be easy to operate while remaining strict about privacy and secret handling.

Provider credentials are resolved dynamically based on the authenticated user context and the requested provider.

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

### UserProviderCredential

Represents a provider secret owned by a user for a specific provider.

Suggested minimum fields:

- `id`
- `userId`
- `providerId`
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
- Ollama cloud: `{ "baseUrl": "https://ollama.com/api", "apiKey": "..." }`

## Runtime Flow

### Admin Control Plane

1. An authorized user submits a provider secret through `admin-web`.
2. `admin-api` validates the request.
3. `admin-api` encrypts the secret using the active master key.
4. `admin-api` stores the encrypted credential record.
5. `admin-api` returns metadata only, never the raw secret.

### Gateway Data Plane

1. A caller sends a gateway request.
2. `gateway-api` resolves the effective user context.
3. `gateway-api` resolves the provider credential for that user and provider.
4. `gateway-api` decrypts the secret in memory.
5. `gateway-api` invokes the provider adapter with the decrypted provider access configuration.
6. The secret is discarded after request execution.

## Resolution Rules

The first implementation should keep resolution explicit.

Recommended rule order:

1. request specifies `providerId`
2. gateway resolves the authenticated user
3. gateway loads the active credential for that user and provider
4. if no credential exists, fail with a clear server-side error

Do not introduce implicit secret fallback chains in Phase 1.

## Security Rules

- raw provider secrets must never be returned after creation
- raw provider secrets must never be logged
- decrypted secrets must stay server-side only
- frontend state must never store provider secrets after submission
- credential lookup must be authorization-aware

## Storage Guidance

The storage backend may begin in a simple persistence layer, but the model should already support:

- one user having multiple provider credentials
- one provider existing across many users
- key rotation through `keyVersion`
- revocation and replacement

## Recommendation

Use Postgres as the long-term source of truth for users, roles, and provider credentials.

Redis or Valkey may still be used for sessions and short-lived operational state, but not as the final durable home for encrypted provider credentials.
