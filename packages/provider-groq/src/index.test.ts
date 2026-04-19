import assert from 'node:assert/strict';
import test from 'node:test';

import { GroqProviderAdapter } from './index';

test('GroqProviderAdapter lists models from the Groq OpenAI-compatible endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        object: 'list',
        data: [{ id: 'llama-3.3-70b-versatile', owned_by: 'Groq' }],
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const adapter = new GroqProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'req-1',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'groq-token',
      },
    });

    assert.equal(calls[0]?.url, 'https://api.groq.com/openai/v1/models');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer groq-token');
    assert.deepEqual(models, [
      {
        id: 'llama-3.3-70b-versatile',
        displayName: 'llama-3.3-70b-versatile',
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GroqProviderAdapter sends chat requests through /chat/completions', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        id: 'chatcmpl-1',
        object: 'chat.completion',
        created: 1730241104,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from groq',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as typeof fetch;

  try {
    const adapter = new GroqProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-2',
        userId: 'user-1',
        providerAccess: { apiKey: 'groq-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://api.groq.com/openai/v1/chat/completions',
    );
    assert.equal(response.message.content, 'hello from groq');
    assert.equal(response.usage?.totalTokens, 15);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
