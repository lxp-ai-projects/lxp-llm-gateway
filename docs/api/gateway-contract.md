# Gateway API Contract

## Endpoint

- `POST /api/v1/chat`
- `GET /api/v1/openai/models`
- `POST /api/v1/openai/chat/completions`

The gateway supports two response modes:

- non-stream JSON response
- provider SSE passthrough when `stream=true`

Authentication uses:

- `Authorization: Bearer <access-token>`
- or, for trusted OpenAI-compatible internal callers, `Authorization: Bearer <shared-compatibility-api-key>`

The gateway validates the access token, resolves the caller through `emailHash`, finds the active provider credential for that user, decrypts it server-side, and dispatches the provider request.

For trusted OpenAI-compatible callers such as `Open WebUI`, the gateway can also:

- authenticate the caller through `LXP_OPENAI_COMPAT_API_KEY`
- optionally correlate the effective user from a trusted forwarded email header such as `X-OpenWebUI-User-Email`
- optionally accept a trusted proxy-auth style email header such as `X-Auth-Request-Email` or `X-Forwarded-Email` when explicitly configured
- otherwise fall back to `LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL`

Trusted identity headers are configured through:

- `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER` for the legacy single-header mode
- `LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS` for a comma-separated allowlist used by trusted proxy or OIDC-backed deployments

If multiple trusted identity headers are configured and the request supplies conflicting email values, the gateway rejects the request.

## Request

Example:

```json
{
  "providerId": "nanogpt",
  "model": "z-ai/glm-4.6:thinking",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": "Allo! Je m'appelle Patrick."
    }
  ]
}
```

Fields:

- `providerId?`: provider identifier, currently `nanogpt`, `openrouter`, `ollama`, `groq`, `google`, `xai`, `openai`, or `anthropic`
- `model?`: provider model name
- `messages`: OpenAI-style chat messages
- `stream?`: when `true`, the gateway returns SSE

`messages[].content` can be either:

- a plain string
- an array of normalized content blocks, currently:
  - `{ "type": "text", "text": "..." }`
  - `{ "type": "image_url", "image_url": { "url": "https://..." } }`
  - `{ "type": "image_url", "image_url": { "url": "data:image/png;base64,...", "detail": "high" } }`

If `providerId` is omitted, the gateway uses the authenticated user's configured `defaultProviderId`.

If `model` is omitted, the gateway uses the authenticated user's `defaultModel`, but only when it belongs to the resolved default provider.

If neither explicit values nor valid defaults exist, the gateway rejects the request with a `400`.

For image routes, the same fallback rule applies, but with the authenticated user's image-specific defaults: `defaultImageProviderId` and `defaultImageModel`.

## OpenAI-Compatible Endpoints

The OpenAI-compatible facade exists for protocol-oriented internal clients such as `Open WebUI`.

### `GET /api/v1/openai/models`

Returns an OpenAI-compatible model list:

```json
{
  "object": "list",
  "data": [
    {
      "id": "nanogpt/z-ai/glm-4.6:thinking",
      "object": "model",
      "created": 1777315200,
      "owned_by": "nanogpt"
    }
  ]
}
```

Notes:

- model IDs are prefixed as `<providerId>/<providerModelId>` so the gateway can route them back unambiguously
- only models reachable through the effective user's configured provider credentials are returned
- providers whose credentials are missing or invalid are skipped rather than failing the entire list

### `POST /api/v1/openai/chat/completions`

Example request:

```json
{
  "model": "nanogpt/z-ai/glm-4.6:thinking",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": "Hello from Open WebUI"
    }
  ]
}
```

Multimodal example request:

```json
{
  "model": "openrouter/openai/gpt-5-image",
  "stream": false,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "Describe this image and suggest a caption."
        },
        {
          "type": "image_url",
          "image_url": {
            "url": "https://example.com/photo.png",
            "detail": "high"
          }
        }
      ]
    }
  ]
}
```

Example response:

```json
{
  "id": "5efa2f1b-5c42-4666-ba34-570989c2a758",
  "object": "chat.completion",
  "created": 1777315200,
  "model": "nanogpt/z-ai/glm-4.6:thinking",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello from the gateway"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 352,
    "completion_tokens": 395,
    "total_tokens": 747
  }
}
```

Current compatibility limits:

- the facade supports plain string content plus normalized `text` and `image_url` message blocks
- provider support for chat image attachments remains provider-specific
- providers that are still text-only in gateway chat may reject `image_url` blocks explicitly
- the facade currently covers model listing and chat completions, not image endpoints
- streaming remains SSE passthrough from the existing gateway chat stream

## Non-Stream Response

The gateway returns a normalized JSON response:

```json
{
  "requestId": "5efa2f1b-5c42-4666-ba34-570989c2a758",
  "providerId": "nanogpt",
  "model": "z-ai/glm-4.6:thinking",
  "message": {
    "role": "assistant",
    "content": "Bonjour Patrick!",
    "reasoning": "1. Analyze the input. 2. Draft the answer. 3. Finalize.",
    "reasoningDetails": [
      {
        "type": "summary",
        "text": "reasoning trace"
      }
    ]
  },
  "finishReason": "stop",
  "usage": {
    "promptTokens": 352,
    "completionTokens": 395,
    "totalTokens": 747,
    "reasoningTokens": 373
  },
  "providerMetadata": {
    "id": "20260415114122a66cadff89a046cf",
    "object": "chat.completion",
    "created": 1776224483,
    "x_nanogpt_pricing": {
      "amount": 0,
      "currency": "USD"
    }
  }
}
```

Notes:

- `message.role` is normalized to `assistant`
- `message.reasoning` and `message.reasoningDetails` are exposed when the provider includes them in the final non-stream payload
- `providerMetadata` preserves useful provider-native fields without making them first-class gateway fields

## Stream Response

When `stream=true`, the gateway returns:

- `Content-Type: text/event-stream; charset=utf-8`

The gateway currently performs provider SSE passthrough for OpenAI-compatible provider streams. This preserves provider-native deltas such as:

- `choices[0].delta.reasoning`
- `choices[0].delta.content`

Example chunks:

```text
data: {"choices":[{"delta":{"reasoning":"1. Analyze the input..."}}]}

data: {"choices":[{"delta":{"content":"Bonjour Patrick !"}}]}
```

This is intentionally not normalized yet. The current design keeps reasoning and content deltas intact for thinking-capable models.

For native Ollama `/api/chat` streams, the adapter converts provider-native NDJSON chunks into gateway SSE chunks that keep the same `choices[0].delta.*` shape expected by the admin web client.

## Identity Resolution

The gateway does not trust a caller-provided `userId`.

Instead it:

1. validates the access token
2. reads `emailHash` from the token
3. resolves the internal user record by `users.email_hash`
4. loads the active provider credential for that internal user

Public-facing admin workflows use `userUuid`, not the internal database row id.

## Current Provider Notes

For NanoGPT and other OpenAI-compatible providers:

- non-stream reasoning is read from `choices[0].message.reasoning`
- non-stream reasoning details are read from `choices[0].message.reasoning_details`
- streaming reasoning is relayed from `choices[0].delta.reasoning`
- streaming content is relayed from `choices[0].delta.content`

For Groq:

- the gateway uses the OpenAI-compatible Groq base URL `https://api.groq.com/openai/v1`
- model listing uses `/models`
- chat uses `/chat/completions`
- bearer auth is required
- Groq is not Grok from xAI

For Google Gemini:

- the gateway uses the Google Gemini OpenAI-compatible base URL `https://generativelanguage.googleapis.com/v1beta/openai`
- model listing uses `/models`
- chat uses `/chat/completions`
- bearer auth is required
- support is validated
- the free tier is subject to Google's rate limits
- usage is billed through the caller's Google AI account, so API keys must be protected carefully

For xAI Grok:

- the gateway uses the xAI base URL `https://api.x.ai/v1`
- model listing uses `/models`
- chat uses `/chat/completions`
- bearer auth is required
- support is experimental and requires additional certification tests before it should be treated as stable
- usage is billed through the caller's xAI account, so API keys must be protected carefully

For OpenAI:

- the gateway uses the OpenAI base URL `https://api.openai.com/v1`
- model listing uses `/models`
- chat uses `/chat/completions`
- bearer auth is required
- support is experimental and requires additional certification tests before it should be treated as stable
- the Chat Completions API is used for compatibility with the current gateway seam, although OpenAI recommends the newer Responses API for new projects

For Anthropic Claude:

- the gateway uses the Anthropic base URL `https://api.anthropic.com`
- model listing uses `GET /v1/models`
- chat uses `POST /v1/messages`
- auth uses the `x-api-key` header plus `anthropic-version`
- support is experimental and requires additional certification tests before it should be treated as stable
- Anthropic streaming events are normalized by the adapter into the gateway SSE shape expected by `admin-web`

For Ollama:

- local/runtime deployments can use `http://127.0.0.1:11434` or `http://127.0.0.1:11434/v1`
- local model listing uses `/api/tags`
- local chat uses `/v1/chat/completions`
- Ollama Cloud can use `https://ollama.com`
- Ollama Cloud model listing uses `/api/tags`
- Ollama Cloud chat uses `/api/chat`
- Ollama Cloud requires bearer auth
