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

test('OllamaProviderAdapter appends /v1 for chat when the configured base URL is native-only', async () => {
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
              content: 'normalized',
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
    await adapter.chat(
      {
        model: 'qwen3:8b',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-4',
        userId: 'user-1',
        providerAccess: {
          baseUrl: 'http://127.0.0.1:11434',
        },
      },
    );

    assert.equal(calls[0]?.url, 'http://127.0.0.1:11434/v1/chat/completions');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter routes cloud chat through the native /api/chat endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        message: {
          role: 'assistant',
          content: 'hello from cloud',
        },
        done_reason: 'stop',
        prompt_eval_count: 10,
        eval_count: 5,
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
        model: 'glm-5.1',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-5',
        userId: 'user-1',
        providerAccess: {
          baseUrl: 'https://ollama.com',
          apiKey: 'cloud-token',
        },
      },
    );

    assert.equal(calls[0]?.url, 'https://ollama.com/api/chat');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer cloud-token');
    assert.equal(response.message.content, 'hello from cloud');
    assert.equal(response.usage?.totalTokens, 15);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter routes local GLM thinking requests through the native chat endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        message: {
          role: 'assistant',
          content: 'hello from local glm',
          thinking: 'reasoning trace',
        },
        done_reason: 'stop',
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
        model: 'glm-4.5',
        providerOptions: {
          ollama: {
            thinking: {
              enabled: true,
            },
          },
        },
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-ollama-local-glm',
        userId: 'user-1',
        providerAccess: {
          baseUrl: 'http://127.0.0.1:11434/v1',
        },
      },
    );

    assert.equal(calls[0]?.url, 'http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      think?: boolean;
    };
    assert.equal(body.think, true);
    assert.equal(response.message.reasoning, 'reasoning trace');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter requires an API key for ollama.com cloud access', async () => {
  const adapter = new OllamaProviderAdapter();

  await assert.rejects(
    adapter.listModels?.({
      requestId: 'req-6',
      userId: 'user-1',
      providerAccess: {
        baseUrl: 'https://ollama.com',
      },
    }),
    /requires an API key/,
  );
});

test('OllamaProviderAdapter transforms native cloud streams into SSE chat chunks', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              `${JSON.stringify({
                message: { content: 'hello ' },
                done: false,
              })}\n${JSON.stringify({
                message: { content: 'world' },
                done: true,
                done_reason: 'stop',
              })}\n`,
            ),
          );
          controller.close();
        },
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/x-ndjson',
        },
      },
    )) as typeof fetch;

  try {
    const adapter = new OllamaProviderAdapter();
    const stream = await adapter.chatStream?.(
      {
        model: 'glm-5.1',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-7',
        userId: 'user-1',
        providerAccess: {
          baseUrl: 'https://ollama.com',
          apiKey: 'cloud-token',
        },
      },
    );

    const reader = stream!.getReader();
    const chunks: string[] = [];
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      chunks.push(decoder.decode(value));
    }

    assert.match(chunks.join(''), /"content":"hello "/);
    assert.match(chunks.join(''), /"content":"world"/);
    assert.match(chunks.join(''), /"finish_reason":"stop"/);
    assert.match(chunks.join(''), /\[DONE\]/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OllamaProviderAdapter rejects gateway chat image attachments with a clear error', async () => {
  const adapter = new OllamaProviderAdapter();

  await assert.rejects(
    () =>
      adapter.chat(
        {
          model: 'qwen3:8b',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe this image' },
                {
                  type: 'image_url',
                  image_url: { url: 'https://example.com/cat.png' },
                },
              ],
            },
          ],
        },
        {
          requestId: 'req-8',
          userId: 'user-1',
          providerAccess: {
            baseUrl: 'http://127.0.0.1:11434/v1',
          },
        },
      ),
    /Ollama gateway chat does not yet support image attachments/i,
  );
});
