import assert from 'node:assert/strict';
import test from 'node:test';

import { XaiProviderAdapter } from './index';

test('XaiProviderAdapter lists models from the xAI models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [{ id: 'grok-4-fast' }, { id: 'grok-4' }],
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
    const adapter = new XaiProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'xai-token',
      },
    });

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer xai-token',
    );
    assert.deepEqual(models, [
      { id: 'grok-4-fast', displayName: 'grok-4-fast' },
      { id: 'grok-4', displayName: 'grok-4' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter sends chat requests to the xAI chat completions endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from grok',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 12,
          total_tokens: 22,
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
    const adapter = new XaiProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'grok-4-fast',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/chat/completions');
    assert.equal(response.providerId, 'xai');
    assert.equal(response.model, 'grok-4-fast');
    assert.equal(response.message.content, 'hello from grok');
    assert.equal(response.usage?.totalTokens, 22);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
