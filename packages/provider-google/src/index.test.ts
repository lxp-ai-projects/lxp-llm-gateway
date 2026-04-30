import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import { GoogleProviderAdapter } from './index';

class GoogleProviderAdapterTestDouble extends GoogleProviderAdapter {
  constructor(
    private readonly resolvedAddresses: Array<{ address: string; family: number }>,
  ) {
    super();
  }

  protected override lookupHostname() {
    return Promise.resolve(this.resolvedAddresses);
  }
}

test('GoogleProviderAdapter lists chat and image models with provider-owned image metadata', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [{ id: 'gemini-2.5-pro' }, { id: 'gemini-2.5-flash-image' }],
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

    const flashImage = models.find(
      (model) => model.id === 'gemini-2.5-flash-image',
    );
    const proImage = models.find(
      (model) => model.id === 'gemini-3-pro-image-preview',
    );
    const nanoBanana2 = models.find(
      (model) => model.id === 'gemini-3.1-flash-image-preview',
    );

    assert.ok(flashImage);
    assert.equal(flashImage.displayName, 'Nano Banana');
    assert.equal(flashImage.capabilities?.supportsImageGeneration, true);
    assert.equal(flashImage.capabilities?.supportsImageEditing, true);
    assert.deepEqual(
      flashImage.capabilities?.supportedImageResponseFormats,
      ['b64_json'],
    );
    assert.deepEqual(flashImage.capabilities?.supportedImageResolutions, [
      { value: '1K', label: '1K' },
    ]);

    assert.ok(proImage);
    assert.equal(proImage.displayName, 'Nano Banana Pro');
    assert.equal(proImage.capabilities?.maxReferenceImagesPerRequest, 14);
    assert.deepEqual(
      proImage.capabilities?.supportedImageResolutions,
      [
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
      ],
    );

    assert.ok(nanoBanana2);
    assert.equal(nanoBanana2.displayName, 'Nano Banana 2');
    assert.deepEqual(
      nanoBanana2.capabilities?.supportedImageResolutions,
      [
        { value: '512', label: '512' },
        { value: '1K', label: '1K' },
        { value: '2K', label: '2K' },
        { value: '4K', label: '4K' },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter exposes a normalized image catalog with the expected default model', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ id: 'gemini-2.5-pro' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    )) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'google-token' },
    });

    assert.ok(catalog);
    assert.equal(catalog.providerId, 'google');
    assert.equal(catalog.defaultModelId, 'gemini-2.5-flash-image');
    assert.deepEqual(
      catalog.models.map((model) => model.id),
      [
        'gemini-2.5-flash-image',
        'gemini-3-pro-image-preview',
        'gemini-3.1-flash-image-preview',
      ],
    );
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

test('GoogleProviderAdapter forwards multimodal chat content blocks unchanged', async () => {
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
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    await adapter.chat(
      {
        model: 'gemini-2.5-pro',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Explain this image.',
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
        requestId: 'request-multimodal-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
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
            text: 'Explain this image.',
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

test('GoogleProviderAdapter sends native image generation requests to Gemini generateContent', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        responseId: 'response-1',
        modelVersion: 'gemini-3-pro-image-preview-2026-04-01',
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'base64-image-1',
                  },
                },
                {
                  text: 'Generated with Nano Banana Pro',
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    const response = await adapter.generateImage(
      {
        model: 'gemini-3-pro-image-preview',
        prompt: 'A premium skincare product shot on marble',
        n: 2,
        aspectRatio: '4:5',
        responseFormat: 'b64_json',
        resolution: '4K',
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
    );
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>)['x-goog-api-key'],
      'google-token',
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      contents: [
        {
          role: 'user',
          parts: [{ text: 'A premium skincare product shot on marble' }],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        candidateCount: 2,
        imageConfig: {
          aspectRatio: '4:5',
          imageSize: '4K',
        },
      },
    });
    assert.equal(response.images[0]?.b64Json, 'base64-image-1');
    assert.equal(response.images[0]?.mimeType, 'image/png');
    assert.deepEqual(response.providerMetadata, {
      modelVersion: 'gemini-3-pro-image-preview-2026-04-01',
      responseId: 'response-1',
      promptFeedback: undefined,
      textOutputs: ['Generated with Nano Banana Pro'],
      usageMetadata: undefined,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter sends image edit requests with data URL references to Gemini generateContent', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'base64-edited-image',
                  },
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();
    const response = await adapter.editImage(
      {
        model: 'gemini-2.5-flash-image',
        prompt: 'Put this logo on the shirt',
        images: [
          {
            type: 'data_url',
            url: 'data:image/png;base64,abc123',
            mimeType: 'image/png',
          },
        ],
        responseFormat: 'b64_json',
        resolution: '1K',
      },
      {
        requestId: 'request-2',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Put this logo on the shirt' },
            {
              inline_data: {
                mime_type: 'image/png',
                data: 'abc123',
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          imageSize: '1K',
        },
      },
    });
    assert.equal(response.images[0]?.b64Json, 'base64-edited-image');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter fetches a remote HTTPS image reference before calling Gemini generateContent', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    if (String(url) === 'https://example.com/reference.png') {
      return new Response(Buffer.from('remote-image-bytes'), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': String(Buffer.byteLength('remote-image-bytes')),
        },
      });
    }

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'image/png',
                    data: 'base64-edited-image',
                  },
                },
              ],
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapterTestDouble([
      { address: '93.184.216.34', family: 4 },
    ]);
    const response = await adapter.editImage(
      {
        model: 'gemini-2.5-flash-image',
        prompt: 'Edit this image',
        images: [
          {
            type: 'image_url',
            url: 'https://example.com/reference.png',
          },
        ],
        responseFormat: 'b64_json',
      },
      {
        requestId: 'request-3',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://example.com/reference.png');
    assert.equal(calls[1]?.url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent');
    assert.deepEqual(JSON.parse(String(calls[1]?.init?.body)), {
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Edit this image' },
            {
              inline_data: {
                mime_type: 'image/png',
                data: Buffer.from('remote-image-bytes').toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {},
      },
    });
    assert.equal(response.images[0]?.b64Json, 'base64-edited-image');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter rejects insecure remote image URLs', async () => {
  const adapter = new GoogleProviderAdapter();

  await assert.rejects(
    () =>
      adapter.editImage(
        {
          model: 'gemini-2.5-flash-image',
          prompt: 'Edit this image',
          images: [
            {
              type: 'image_url',
              url: 'http://example.com/reference.png',
            },
          ],
          responseFormat: 'b64_json',
        },
        {
          requestId: 'request-4',
          userId: 'user-1',
          providerAccess: { apiKey: 'google-token' },
        },
      ),
    /require HTTPS/,
  );
});

test('GoogleProviderAdapter rejects private or local remote image targets', async () => {
  const adapter = new GoogleProviderAdapterTestDouble([
    { address: '127.0.0.1', family: 4 },
  ]);

  await assert.rejects(
    () =>
      adapter.editImage(
        {
          model: 'gemini-2.5-flash-image',
          prompt: 'Edit this image',
          images: [
            {
              type: 'image_url',
              url: 'https://example.com/reference.png',
            },
          ],
          responseFormat: 'b64_json',
        },
        {
          requestId: 'request-5',
          userId: 'user-1',
          providerAccess: { apiKey: 'google-token' },
        },
      ),
    /cannot resolve to private or local IP ranges/,
  );
});

test('GoogleProviderAdapter rejects remote image responses with unsupported MIME types', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('not-an-image', {
      status: 200,
      headers: {
        'content-type': 'text/plain',
        'content-length': String(Buffer.byteLength('not-an-image')),
      },
    })) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapterTestDouble([
      { address: '93.184.216.34', family: 4 },
    ]);

    await assert.rejects(
      () =>
        adapter.editImage(
          {
            model: 'gemini-2.5-flash-image',
            prompt: 'Edit this image',
            images: [
              {
                type: 'image_url',
                url: 'https://example.com/reference.txt',
              },
            ],
            responseFormat: 'b64_json',
          },
          {
            requestId: 'request-6',
            userId: 'user-1',
            providerAccess: { apiKey: 'google-token' },
          },
        ),
      /supported image MIME type/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter formats quota exceeded errors for image requests', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 429,
          message:
            'You exceeded your current quota, please check your plan and billing details.\nPlease retry in 27.638094876s.',
          status: 'RESOURCE_EXHAUSTED',
          details: [
            {
              '@type': 'type.googleapis.com/google.rpc.Help',
              links: [
                {
                  description: 'Learn more about Gemini API quotas',
                  url: 'https://ai.google.dev/gemini-api/docs/rate-limits',
                },
              ],
            },
            {
              '@type': 'type.googleapis.com/google.rpc.RetryInfo',
              retryDelay: '27s',
            },
          ],
        },
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      },
    )) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();

    await assert.rejects(
      () =>
        adapter.generateImage(
          {
            model: 'gemini-2.5-flash-image',
            prompt: 'A product shot',
            responseFormat: 'b64_json',
          },
          {
            requestId: 'request-7',
            userId: 'user-1',
            providerAccess: { apiKey: 'google-token' },
          },
        ),
      /Google Gemini quota exceeded \(RESOURCE_EXHAUSTED\).*Retry in 27s.*rate-limits/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GoogleProviderAdapter formats temporary high-demand image errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          code: 503,
          message:
            'This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.',
          status: 'UNAVAILABLE',
        },
      }),
      {
        status: 503,
        headers: { 'content-type': 'application/json' },
      },
    )) as typeof fetch;

  try {
    const adapter = new GoogleProviderAdapter();

    await assert.rejects(
      () =>
        adapter.generateImage(
          {
            model: 'gemini-2.5-flash-image',
            prompt: 'A product shot',
            responseFormat: 'b64_json',
          },
          {
            requestId: 'request-8',
            userId: 'user-1',
            providerAccess: { apiKey: 'google-token' },
          },
        ),
      /Google Gemini is temporarily unavailable due to high demand \(UNAVAILABLE\).*Please try again later\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
