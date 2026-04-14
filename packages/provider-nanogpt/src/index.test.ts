import assert from 'node:assert/strict';
import test from 'node:test';

import { NanoGptProviderAdapter } from './index';

test('NanoGptProviderAdapter sends an OpenAI-compatible chat completions request', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: 'hello from nanogpt',
            },
          },
        ],
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
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    const response = await adapter.chat(
      {
        model: 'openai/gpt-5.2',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-1',
        userId: 'user-1',
        providerCredential: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/chat/completions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer nano-secret-token');
    assert.equal(response.outputText, 'hello from nanogpt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
