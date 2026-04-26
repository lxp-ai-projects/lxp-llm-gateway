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

test('NanoGptProviderAdapter exposes NanoGPT image models from the subscription and paid endpoints', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (url) => {
    const rawUrl = String(url);
    calls.push(rawUrl);

    if (rawUrl.includes('/subscription/v1/image-models')) {
      return new Response(
        JSON.stringify({
          object: 'list',
          data: [
            {
              id: 'hidream',
              object: 'model',
              created: 1706745600,
              owned_by: 'hidream',
              name: 'HiDream',
              category: 'image',
              capabilities: {
                image_generation: true,
                image_to_image: false,
                inpainting: false,
              },
              supported_parameters: {
                resolutions: ['1024x1024', '512x512'],
                max_images: 4,
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
    }

    return new Response(
      JSON.stringify({
        object: 'list',
        data: [
          {
            id: 'gpt-image-1',
            object: 'model',
            created: 1706745600,
            owned_by: 'openai',
            name: 'GPT Image 1',
            category: 'image',
            capabilities: {
              image_generation: true,
              image_to_image: true,
              inpainting: false,
            },
            supported_parameters: {
              resolutions: ['1024x1024'],
              max_images: 1,
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
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'req-image-catalog',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'nano-secret-token',
      },
    });

    assert.ok(catalog);
    assert.deepEqual(calls, [
      'https://nano-gpt.com/api/subscription/v1/image-models?detailed=true',
      'https://nano-gpt.com/api/paid/v1/image-models?detailed=true',
      'https://nano-gpt.com/api/v1/image-models?detailed=true',
    ]);
    assert.equal(catalog.defaultModelId, 'hidream');
    assert.deepEqual(
      catalog.models
        .map((model) => ({
          id: model.id,
          paid: model.capabilities.requiresPaidAccess,
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
      [
        { id: 'gpt-image-1', paid: true },
        { id: 'hidream', paid: false },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter falls back to the canonical image catalog when NanoGPT filtered endpoints are unavailable', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (async (url) => {
    const rawUrl = String(url);
    calls.push(rawUrl);

    if (
      rawUrl.includes('/subscription/v1/image-models') ||
      rawUrl.includes('/paid/v1/image-models')
    ) {
      return new Response('not found', { status: 404 });
    }

    if (rawUrl.includes('/v1/image-models')) {
      return new Response(
        JSON.stringify({
          object: 'list',
          data: [
            {
              id: 'hidream',
              object: 'model',
              created: 1706745600,
              owned_by: 'hidream',
              name: 'HiDream',
              category: 'image',
              capabilities: {
                image_generation: true,
                image_to_image: true,
                inpainting: false,
              },
              supported_parameters: {
                resolutions: ['1024x1024'],
                max_images: 4,
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
    }

    return new Response('unexpected', { status: 500 });
  }) as typeof fetch;

  try {
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'req-image-catalog-fallback',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'nano-secret-token',
      },
    });

    assert.ok(catalog);
    assert.equal(catalog?.defaultModelId, 'hidream');
    assert.deepEqual(
      catalog?.models.map((model) => ({
        id: model.id,
        requiresPaidAccess: model.capabilities.requiresPaidAccess,
      })),
      [
        {
          id: 'hidream',
          requiresPaidAccess: false,
        },
      ],
    );
    assert.ok(calls.some((url) => url.includes('/subscription/v1/image-models')));
    assert.ok(calls.some((url) => url.includes('/paid/v1/image-models')));
    assert.ok(calls.some((url) => url.includes('/v1/image-models')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter sends image generation requests to the NanoGPT image endpoint', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        created: 123,
        data: [{ b64_json: 'generated-base64' }],
        cost: 0.04,
        paymentSource: 'subscription',
        remainingBalance: 12.34,
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
    const response = await adapter.generateImage?.(
      {
        model: 'hidream',
        prompt: 'A sunset over a mountain range',
        n: 2,
        responseFormat: 'b64_json',
        resolution: '1024x1024',
      },
      {
        requestId: 'req-image-generate',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.ok(response);
    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/images/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'hidream',
      prompt: 'A sunset over a mountain range',
      n: 2,
      size: '1024x1024',
      response_format: 'b64_json',
      user: 'user-1',
    });
    assert.equal(response.images[0]?.b64Json, 'generated-base64');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter sends image edit requests with data URL references', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        created: 124,
        data: [{ b64_json: 'edited-base64' }],
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
    const response = await adapter.editImage?.(
      {
        model: 'gpt-image-1',
        prompt: 'Combine these images into a creative collage',
        images: [
          {
            type: 'data_url',
            url: 'data:image/png;base64,abc123',
            mimeType: 'image/png',
          },
          {
            type: 'data_url',
            url: 'data:image/jpeg;base64,def456',
            mimeType: 'image/jpeg',
          },
        ],
        responseFormat: 'b64_json',
        resolution: '1024x1024',
      },
      {
        requestId: 'req-image-edit',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.ok(response);
    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/images/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'gpt-image-1',
      prompt: 'Combine these images into a creative collage',
      size: '1024x1024',
      response_format: 'b64_json',
      user: 'user-1',
      imageDataUrls: [
        'data:image/png;base64,abc123',
        'data:image/jpeg;base64,def456',
      ],
    });
    assert.equal(response.images[0]?.b64Json, 'edited-base64');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
