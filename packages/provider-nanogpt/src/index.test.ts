import assert from 'node:assert/strict';
import test from 'node:test';

import { NanoGptProviderAdapter } from './index';
import { buildNanoGptImageCatalog } from './image/catalog.js';

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
        model: 'z-ai/glm-5',
        maxOutputTokens: 2048,
        providerOptions: {
          zai: {
            thinking: {
              type: 'enabled',
              clearThinking: false,
            },
          },
        },
        messages: [
          { role: 'user', content: 'hello' },
          {
            role: 'assistant',
            content: 'previous answer',
            reasoningContent: 'previous reasoning',
          },
        ],
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
    const body = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      max_tokens?: number;
      thinking?: { type?: string; clear_thinking?: boolean };
      messages?: Array<{
        role?: string;
        content?: unknown;
        reasoning_content?: string;
      }>;
    };
    assert.equal(body.max_tokens, 2048);
    assert.deepEqual(body.thinking, {
      type: 'enabled',
      clear_thinking: false,
    });
    assert.deepEqual(body.messages, [
      {
        role: 'user',
        content: 'hello',
      },
      {
        role: 'assistant',
        content: 'previous answer',
        reasoning_content: 'previous reasoning',
      },
    ]);
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

test('NanoGptProviderAdapter maps reasoning_content responses for GLM-style providers', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from nanogpt',
              reasoning_content: 'glm reasoning',
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
    )) as typeof fetch;

  try {
    const adapter = new NanoGptProviderAdapter('https://nano-gpt.com/api/v1');
    const response = await adapter.chat(
      {
        model: 'z-ai/glm-4.5',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-glm-reasoning',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.equal(response.message.reasoning, 'glm reasoning');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('NanoGptProviderAdapter forwards multimodal chat content blocks unchanged', async () => {
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
    await adapter.chat(
      {
        model: 'openai/gpt-5.2',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Describe this image in one sentence.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: 'https://example.com/reference.png',
                },
              },
            ],
          },
        ],
      },
      {
        requestId: 'req-multimodal-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      messages?: unknown;
    };
    assert.deepEqual(body.messages, [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe this image in one sentence.',
          },
          {
            type: 'image_url',
            image_url: {
              url: 'https://example.com/reference.png',
            },
          },
        ],
      },
    ]);
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

test('NanoGptProviderAdapter assigns Google-aligned multi-reference limits to Nano Banana variants', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (url) => {
    const rawUrl = String(url);

    if (rawUrl.includes('/subscription/v1/image-models')) {
      return new Response(
        JSON.stringify({
          object: 'list',
          data: [
            {
              id: 'nano-banana-2',
              object: 'model',
              created: 1706745600,
              owned_by: 'google',
              name: 'Nano Banana 2',
              category: 'image',
              capabilities: {
                image_generation: true,
                image_to_image: true,
                inpainting: false,
              },
              supported_parameters: {
                resolutions: ['1K', '2K', '4K'],
                max_images: 4,
              },
            },
            {
              id: 'nano-banana-pro-edit',
              object: 'model',
              created: 1706745600,
              owned_by: 'google',
              name: 'Nano Banana Pro Edit',
              category: 'image',
              capabilities: {
                image_generation: true,
                image_to_image: true,
                inpainting: true,
              },
              supported_parameters: {
                resolutions: ['1K', '2K', '4K'],
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
            id: 'nano-banana-pro-edit-ultra',
            object: 'model',
            created: 1706745600,
            owned_by: 'google',
            name: 'Nano Banana Pro Ultra Edit',
            category: 'image',
            capabilities: {
              image_generation: true,
              image_to_image: true,
              inpainting: true,
            },
            supported_parameters: {
              resolutions: ['4K', '8K'],
              max_images: 2,
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
      requestId: 'req-image-catalog-banana',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'nano-secret-token',
      },
    });

    assert.ok(catalog);
    const modelLimits = Object.fromEntries(
      (catalog?.models ?? []).map((model) => [
        model.id,
        model.capabilities.maxReferenceImagesPerRequest,
      ]),
    );

    assert.equal(modelLimits['nano-banana-2'], 14);
    assert.equal(modelLimits['nano-banana-pro-edit'], 14);
    assert.equal(modelLimits['nano-banana-pro-edit-ultra'], 10);
    assert.deepEqual(
      catalog?.models.find((model) => model.id === 'nano-banana-2')?.capabilities
        .supportedImageAspectRatios?.map((entry) => entry.value),
      ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
    );
    assert.deepEqual(
      catalog?.models.find((model) => model.id === 'nano-banana-2')?.capabilities
        .supportedImageResolutions,
      [
        { value: '512', label: '512' },
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
      ],
    );
    assert.equal(
      catalog?.models.find((model) => model.id === 'nano-banana-2')?.capabilities
        .imageDefaults?.aspectRatio,
      '1:1',
    );
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
        model: 'gpt-image-1.5',
        prompt: 'A sunset over a mountain range',
        n: 2,
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'transparent',
        quality: 'high',
        moderation: 'low',
        outputFormat: 'webp',
        outputCompression: 80,
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
      model: 'gpt-image-1.5',
      prompt: 'A sunset over a mountain range',
      n: 2,
      size: '1024x1024',
      background: 'transparent',
      quality: 'high',
      moderation: 'low',
      output_format: 'webp',
      output_compression: 80,
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
        background: 'transparent',
        quality: 'high',
        moderation: 'low',
        outputFormat: 'webp',
        outputCompression: 80,
        inputFidelity: 'high',
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
      background: 'transparent',
      quality: 'high',
      moderation: 'low',
      output_format: 'webp',
      output_compression: 80,
      input_fidelity: 'high',
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

test('NanoGptProviderAdapter sends Nano Banana aspect ratio requests to the NanoGPT image endpoint', async () => {
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
        model: 'nano-banana',
        prompt: 'A studio portrait',
        n: 1,
        aspectRatio: '4:5',
        responseFormat: 'b64_json',
        resolution: '1K',
      },
      {
        requestId: 'req-image-generate-banana',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'nano-secret-token',
        },
      },
    );

    assert.ok(response);
    assert.equal(calls[0]?.url, 'https://nano-gpt.com/api/v1/images/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'nano-banana',
      prompt: 'A studio portrait',
      n: 1,
      aspect_ratio: '4:5',
      size: '1K',
      response_format: 'b64_json',
      user: 'user-1',
    });
    assert.equal(response.images[0]?.b64Json, 'generated-base64');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('buildNanoGptImageCatalog aligns Seedream 4.x capabilities with BytePlus image-set docs', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'seedream-4-0-250828',
        name: 'Seedream 4.0',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'seedream-4-0-250828');
  assert.ok(model);
  assert.equal(model.capabilities.supportsImageGeneration, true);
  assert.equal(model.capabilities.supportsImageEditing, true);
  assert.equal(model.capabilities.maxGeneratedImagesPerRequest, 15);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 10);
  assert.deepEqual(model.capabilities.supportedImageResolutions, [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ]);
});

test('buildNanoGptImageCatalog classifies SeedEdit 3.0 as edit-only', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'seededit-3-0-i2i-250628',
        name: 'SeedEdit 3.0',
        category: 'image',
        capabilities: {
          image_generation: false,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'seededit-3-0-i2i-250628');
  assert.ok(model);
  assert.equal(model.capabilities.supportsImageGeneration, false);
  assert.equal(model.capabilities.supportsImageEditing, true);
  assert.equal(model.capabilities.maxGeneratedImagesPerRequest, 1);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 1);
});

test('buildNanoGptImageCatalog applies Seedream 4.5 overrides to NanoGPT-style alias ids', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'seedream-4.5',
        name: 'Seedream 4.5',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'seedream-4.5');
  assert.ok(model);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 10);
  assert.equal(model.capabilities.maxGeneratedImagesPerRequest, 15);
});

test('buildNanoGptImageCatalog aligns NanoGPT OpenAI model aliases with OpenAI edit limits', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'gpt-image-1',
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
      {
        id: 'chatgpt-image-latest',
        name: 'ChatGPT Image Latest',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const modelLimits = Object.fromEntries(
    catalog.models.map((model) => [
      model.id,
      {
        references: model.capabilities.maxReferenceImagesPerRequest,
        generated: model.capabilities.maxGeneratedImagesPerRequest,
      },
    ]),
  );

  assert.deepEqual(modelLimits['gpt-image-1'], {
    references: 16,
    generated: 10,
  });
  assert.deepEqual(modelLimits['chatgpt-image-latest'], {
    references: 16,
    generated: 10,
  });
  assert.deepEqual(
    catalog.models
      .find((model) => model.id === 'gpt-image-1')
      ?.capabilities.supportedImageResponseFormats,
    ['b64_json'],
  );
  assert.deepEqual(
    catalog.models
      .find((model) => model.id === 'gpt-image-1')
      ?.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    catalog.models
      .find((model) => model.id === 'gpt-image-1')
      ?.capabilities.supportedImageInputFidelities?.map((entry) => entry.value),
    ['low', 'high'],
  );
});

test('buildNanoGptImageCatalog aligns GPT Image 1.5 alias ids with OpenAI capabilities', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'gpt-image-1_5',
        name: 'GPT Image 1.5',
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
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'gpt-image-1_5');
  assert.ok(model);
  assert.deepEqual(model.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(
    model.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageQualities?.map((entry) => entry.value),
    ['auto', 'low', 'medium', 'high'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 16);
  assert.equal(model.capabilities.maxGeneratedImagesPerRequest, 10);
});

test('buildNanoGptImageCatalog aligns GPT Image 2 with OpenAI capabilities', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'gpt-image-2',
        name: 'GPT Image 2',
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
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'gpt-image-2');
  assert.ok(model);
  assert.deepEqual(model.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(
    model.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageQualities?.map((entry) => entry.value),
    ['auto', 'low', 'medium', 'high'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    model.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 16);
  assert.equal(model.capabilities.maxGeneratedImagesPerRequest, 10);
});

test('buildNanoGptImageCatalog aligns GPT Image Mini and ChatGPT image alias ids with OpenAI capabilities', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'gpt image 1 mini',
        name: 'GPT Image 1 Mini',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
      {
        id: 'chatgpt image latest',
        name: 'ChatGPT Image Latest',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const miniModel = catalog.models.find((entry) => entry.id === 'gpt image 1 mini');
  const latestModel = catalog.models.find((entry) => entry.id === 'chatgpt image latest');
  assert.ok(miniModel);
  assert.ok(latestModel);
  assert.deepEqual(
    miniModel.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    latestModel.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    latestModel.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
  assert.equal(latestModel.capabilities.maxReferenceImagesPerRequest, 16);
  assert.equal(latestModel.capabilities.maxGeneratedImagesPerRequest, 10);
});

test('buildNanoGptImageCatalog aligns Wan 2.7 Image Pro with Alibaba Cloud multi-reference limits', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'wan-2.7-image-pro',
        name: 'Wan 2.7 Image Pro',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'wan-2.7-image-pro');
  assert.ok(model);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 9);
  assert.deepEqual(model.capabilities.supportedImageResolutions, [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ]);
});

test('buildNanoGptImageCatalog aligns Nano Banana with Google Gemini capabilities', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'nano-banana',
        name: 'Nano Banana',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'nano-banana');
  assert.ok(model);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 5);
  assert.deepEqual(
    model.capabilities.supportedImageAspectRatios?.map((entry) => entry.value),
    ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  );
  assert.deepEqual(model.capabilities.supportedImageResolutions, [
    { value: '1K', label: '1K' },
  ]);
  assert.equal(model.capabilities.imageDefaults?.aspectRatio, '1:1');
  assert.equal(model.capabilities.imageDefaults?.resolution, '1K');
});

test('buildNanoGptImageCatalog aligns Wan 2.7 Image with documented resolution tiers', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'wan2.7-image',
        name: 'Wan 2.7 Image',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'wan2.7-image');
  assert.ok(model);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 9);
  assert.deepEqual(model.capabilities.supportedImageResolutions, [
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
  ]);
});

test('buildNanoGptImageCatalog aligns Qwen Image with a 3-reference edit limit', () => {
  const catalog = buildNanoGptImageCatalog({
    subscriptionModels: [
      {
        id: 'qwen-image',
        name: 'Qwen Image',
        category: 'image',
        capabilities: {
          image_generation: true,
          image_to_image: true,
          inpainting: false,
        },
      },
    ],
    paidModels: [],
  });

  const model = catalog.models.find((entry) => entry.id === 'qwen-image');
  assert.ok(model);
  assert.equal(model.capabilities.maxReferenceImagesPerRequest, 3);
});
