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
        id: 'nano-1',
        object: 'chat.completion',
        created: 1776224483,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from nanogpt',
              reasoning:
                '1. Analyze the input. 2. Draft the answer. 3. Finalize.',
              reasoning_details: [
                {
                  type: 'summary',
                  text: 'reasoning trace',
                },
              ],
            },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 18,
          reasoning_tokens: 3,
        },
        x_nanogpt_pricing: {
          amount: 0,
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
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    const response = await adapter.chat(
      {
        model: 'openai/gpt-5.2',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/chat/completions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer nano-secret-token');
    assert.equal(response.message.role, 'assistant');
    assert.equal(response.message.content, 'hello from nanogpt');
    assert.equal(
      response.message.reasoning,
      '1. Analyze the input. 2. Draft the answer. 3. Finalize.',
    );
    assert.deepEqual(response.message.reasoningDetails, [
      {
        type: 'summary',
        text: 'reasoning trace',
      },
    ]);
    assert.equal(response.finishReason, 'stop');
    assert.equal(response.usage?.totalTokens, 18);
    assert.deepEqual(response.providerMetadata, {
      id: 'nano-1',
      object: 'chat.completion',
      created: 1776224483,
      x_nanogpt_pricing: {
        amount: 0,
      },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter returns the provider SSE body for streaming requests', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      'data: {"choices":[{"delta":{"reasoning":"hi"}}]}\n\n',
      {
        status: 200,
        headers: {
          'content-type': 'text/event-stream',
        },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    const stream = await adapter.chatStream?.(
      {
        model: 'z-ai/glm-4.6:thinking',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      },
      {
        requestId: 'req-2',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.ok(stream);
    assert.equal(calls.length, 1);
    const body = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      stream?: boolean;
    };
    assert.equal(body.stream, true);
    const reader = stream?.getReader();
    const firstChunk = await reader?.read();
    assert.match(new TextDecoder().decode(firstChunk?.value), /reasoning/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter fails with an explicit timeout error when the provider does not respond', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal as AbortSignal | undefined;
      signal?.addEventListener('abort', () => {
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      });
    })) as typeof fetch;

  try {
    const adapter = new NanoGptProviderAdapter(
      'https://nano-gpt.com/api/v1',
      5,
    );

    await assert.rejects(
      () =>
        adapter.chat(
          {
            model: 'z-ai/glm-4.6:thinking',
            messages: [{ role: 'user', content: 'hello' }],
          },
          {
            requestId: 'req-timeout',
            userId: 'user-1',
            providerAccess: {
              apiKey: 'nano-secret-token',
            },
          },
        ),
      /NanoGPT request timed out after 5 ms/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter tolerates a missing providerAccess object at runtime', async () => {
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
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    await adapter.listModels?.({
      requestId: 'req-legacy',
      userId: 'user-1',
      providerAccess: undefined as never,
    });

    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/models');
    const headers = calls[0]?.init?.headers as
      | Record<string, string>
      | undefined;
    assert.equal(headers?.authorization, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
