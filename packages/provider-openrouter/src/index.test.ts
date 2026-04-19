import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenRouterProviderAdapter } from './index';

test('OpenRouterProviderAdapter sends an OpenAI-compatible chat completions request', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        id: 'openrouter-1',
        object: 'chat.completion',
        created: 1776224483,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from openrouter',
            },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 18,
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new OpenRouterProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'openai/gpt-4.1-mini',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer openrouter-secret-token');
    assert.equal(response.message.content, 'hello from openrouter');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter respects a credential-level baseUrl override', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new OpenRouterProviderAdapter();
    await adapter.listModels?.({
      requestId: 'req-2',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'openrouter-secret-token',
        baseUrl: 'https://custom-openrouter.example/v1',
      },
    });

    assert.equal(calls[0]?.url, 'https://custom-openrouter.example/v1/models');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
