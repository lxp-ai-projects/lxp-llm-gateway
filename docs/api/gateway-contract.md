# Gateway API Contract

## Endpoint

- `POST /api/v1/chat`

The gateway supports two response modes:

- non-stream JSON response
- provider SSE passthrough when `stream=true`

Authentication uses:

- `Authorization: Bearer <access-token>`

The gateway validates the access token, resolves the caller through `emailHash`, finds the active provider credential for that user, decrypts it server-side, and dispatches the provider request.

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

- `providerId?`: provider identifier, currently `nanogpt`, `openrouter`, `ollama`, `groq`, or `xai`
- `model?`: provider model name
- `messages`: OpenAI-style chat messages
- `stream?`: when `true`, the gateway returns SSE

If `providerId` is omitted, the gateway uses the authenticated user's configured `defaultProviderId`.

If `model` is omitted, the gateway uses the authenticated user's `defaultModel`, but only when it belongs to the resolved default provider.

If neither explicit values nor valid defaults exist, the gateway rejects the request with a `400`.

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

For xAI Grok:

- the gateway uses the xAI base URL `https://api.x.ai/v1`
- model listing uses `/models`
- chat uses `/chat/completions`
- bearer auth is required
- usage is billed through the caller's xAI account, so API keys must be protected carefully

For Ollama:

- local/runtime deployments can use `http://127.0.0.1:11434` or `http://127.0.0.1:11434/v1`
- local model listing uses `/api/tags`
- local chat uses `/v1/chat/completions`
- Ollama Cloud can use `https://ollama.com`
- Ollama Cloud model listing uses `/api/tags`
- Ollama Cloud chat uses `/api/chat`
- Ollama Cloud requires bearer auth
