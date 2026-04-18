import assert from 'node:assert/strict';
import test from 'node:test';

import { OllamaProviderAdapter } from './index';

test('OllamaProviderAdapter sends a local OpenAI-compatible chat request without auth by default', async () => {
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
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from ollama',
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
    const adapter = new OllamaProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'qwen3:8b',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-1',
        userId: 'user-1',
        providerAccess: {
          baseUrl: 'http://127.0.0.1:11434/v1',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'http://127.0.0.1:11434/v1/chat/completions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, undefined);
    assert.equal(response.message.content, 'hello from ollama');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter can send bearer auth when configured', async () => {
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
    const adapter = new OllamaProviderAdapter();
    await adapter.listModels?.({
      requestId: 'req-2',
      userId: 'user-1',
      providerAccess: {
        baseUrl: 'https://ollama.example/v1',
        apiKey: 'ollama-cloud-token',
      },
    });

    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(calls[0]?.url, 'https://ollama.example/api/tags');
    assert.equal(headers.authorization, 'Bearer ollama-cloud-token');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter maps native /api/tags responses into provider models', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        models: [
          {
            name: 'qwen3:8b',
            model: 'qwen3:8b',
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
    const adapter = new OllamaProviderAdapter();
    const models = await adapter.listModels?.({
      requestId: 'req-3',
      userId: 'user-1',
      providerAccess: {
        baseUrl: 'http://127.0.0.1:11434/v1',
      },
    });

    assert.equal(calls[0]?.url, 'http://127.0.0.1:11434/api/tags');
    assert.deepEqual(models, [
      {
        id: 'qwen3:8b',
        displayName: 'qwen3:8b',
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
