import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiProviderAdapter } from './index';

test('OpenAiProviderAdapter lists models from the OpenAI models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1-mini' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new OpenAiProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'openai-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer openai-token',
    );
    assert.deepEqual(models, [
      { id: 'gpt-4o', displayName: 'gpt-4o' },
      { id: 'gpt-4.1-mini', displayName: 'gpt-4.1-mini' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAiProviderAdapter sends chat requests to the OpenAI chat completions endpoint', async () => {
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
              content: 'hello from openai',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 12,
          total_tokens: 22,
          completion_tokens_details: {
            reasoning_tokens: 4,
          },
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new OpenAiProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'openai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(response.providerId, 'openai');
    assert.equal(response.model, 'gpt-4o');
    assert.equal(response.message.content, 'hello from openai');
    assert.equal(response.usage?.reasoningTokens, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
