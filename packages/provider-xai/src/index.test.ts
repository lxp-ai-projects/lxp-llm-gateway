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

test('XaiProviderAdapter sends image generation requests to the xAI images endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        created: 123,
        model: 'grok-imagine-image',
        data: [
          {
            url: 'https://cdn.x.ai/generated-1.jpg',
            revised_prompt: 'expanded prompt',
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
    const adapter = new XaiProviderAdapter();
    const response = await adapter.generateImage?.(
      {
        model: 'grok-imagine-image',
        prompt: 'A studio portrait of a fox astronaut',
        n: 1,
        aspectRatio: '1:1',
        responseFormat: 'url',
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'grok-imagine-image',
      prompt: 'A studio portrait of a fox astronaut',
      n: 1,
      aspect_ratio: '1:1',
      response_format: 'url',
    });
    assert.equal(response?.images[0]?.url, 'https://cdn.x.ai/generated-1.jpg');
    assert.equal(response?.images[0]?.revisedPrompt, 'expanded prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter sends image edit requests with reference images to the xAI edits endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        model: 'grok-imagine-image',
        data: [
          {
            b64_json: 'base64-image',
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
    const adapter = new XaiProviderAdapter();
    const response = await adapter.editImage?.(
      {
        model: 'grok-imagine-image',
        prompt: 'Turn this into a watercolor illustration',
        images: [
          {
            type: 'image_url',
            url: 'https://example.com/reference.png',
          },
          {
            type: 'data_url',
            url: 'data:image/png;base64,abc123',
          },
        ],
        responseFormat: 'b64_json',
      },
      {
        requestId: 'request-2',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/edits');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'grok-imagine-image',
      prompt: 'Turn this into a watercolor illustration',
      response_format: 'b64_json',
      images: [
        {
          type: 'image_url',
          url: 'https://example.com/reference.png',
        },
        {
          type: 'image_url',
          url: 'data:image/png;base64,abc123',
        },
      ],
    });
    assert.equal(response?.images[0]?.b64Json, 'base64-image');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
