import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleProviderAdapter } from './index';

test('GoogleProviderAdapter lists models from the Gemini OpenAI-compatible models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [{ id: 'gemini-2.5-pro' }, { id: 'gemini-2.5-flash' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'google-token' },
    });

    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/openai/models',
    );
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer google-token',
    );
    assert.deepEqual(models, [
      { id: 'gemini-2.5-pro', displayName: 'gemini-2.5-pro' },
      { id: 'gemini-2.5-flash', displayName: 'gemini-2.5-flash' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter sends chat requests to the Gemini OpenAI-compatible chat completions endpoint', async () => {
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
              content: 'hello from gemini',
            },
          },
        ],
        usage: {
          prompt_tokens: 8,
          completion_tokens: 11,
          total_tokens: 19,
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'gemini-2.5-pro',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    );
    assert.equal(response.providerId, 'google');
    assert.equal(response.model, 'gemini-2.5-pro');
    assert.equal(response.message.content, 'hello from gemini');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
