import assert from 'node:assert/strict';
import test from 'node:test';

import { XaiProviderAdapter } from './index';

class XaiProviderAdapterTestDouble extends XaiProviderAdapter {
  constructor(
    private readonly resolvedAddresses: Array<{ address: string; family: number }> = [
      { address: '93.184.216.34', family: 4 },
    ],
  ) {
    super();
  }

  protected override lookupHostname() {
    return Promise.resolve(this.resolvedAddresses);
  }
}

test('XaiProviderAdapter lists models from the xAI models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [
          { id: 'grok-4-fast' },
          { id: 'grok-imagine-image' },
          { id: 'grok-imagine-image-pro' },
          { id: 'grok-imagine-video' },
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
    const adapter = new XaiProviderAdapterTestDouble();
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
      {
        id: 'grok-4-fast',
        displayName: 'grok-4-fast',
        capabilities: {
          supportsStreaming: true,
        },
      },
      {
        id: 'grok-imagine-image',
        displayName: 'Grok Imagine Image',
        capabilities: {
          supportsStreaming: false,
          supportsImageGeneration: true,
          supportsImageEditing: true,
          supportedImageAspectRatios: [
            {
              value: 'auto',
              label: 'Auto',
              useCase: 'Model auto-selects the best ratio for the prompt.',
            },
            {
              value: '1:1',
              label: '1:1',
              useCase: 'Social media, thumbnails',
            },
            {
              value: '16:9',
              label: '16:9',
              useCase: 'Widescreen, mobile, stories',
            },
            {
              value: '9:16',
              label: '9:16',
              useCase: 'Widescreen, mobile, stories',
            },
            {
              value: '4:3',
              label: '4:3',
              useCase: 'Presentations, portraits',
            },
            {
              value: '3:4',
              label: '3:4',
              useCase: 'Presentations, portraits',
            },
            {
              value: '3:2',
              label: '3:2',
              useCase: 'Photography',
            },
            {
              value: '2:3',
              label: '2:3',
              useCase: 'Photography',
            },
            {
              value: '2:1',
              label: '2:1',
              useCase: 'Banners, headers',
            },
            {
              value: '1:2',
              label: '1:2',
              useCase: 'Banners, headers',
            },
            {
              value: '19.5:9',
              label: '19.5:9',
              useCase: 'Modern smartphone displays',
            },
            {
              value: '9:19.5',
              label: '9:19.5',
              useCase: 'Modern smartphone displays',
            },
            {
              value: '20:9',
              label: '20:9',
              useCase: 'Ultra-wide displays',
            },
            {
              value: '9:20',
              label: '9:20',
              useCase: 'Ultra-wide displays',
            },
          ],
          supportedImageResponseFormats: ['url', 'b64_json'],
          supportedImageResolutions: [
            {
              value: '1k',
              label: '1k',
            },
            {
              value: '2k',
              label: '2k',
            },
          ],
          maxGeneratedImagesPerRequest: 4,
          maxReferenceImagesPerRequest: 5,
          imageDefaults: {
            aspectRatio: 'auto',
            responseFormat: 'url',
            resolution: '1k',
            imageCount: 1,
          },
        },
      },
      {
        id: 'grok-imagine-image-pro',
        displayName: 'Grok Imagine Image Pro',
        capabilities: {
          supportsStreaming: false,
          supportsImageGeneration: true,
          supportsImageEditing: true,
          supportedImageAspectRatios: [
            {
              value: 'auto',
              label: 'Auto',
              useCase: 'Model auto-selects the best ratio for the prompt.',
            },
            {
              value: '1:1',
              label: '1:1',
              useCase: 'Social media, thumbnails',
            },
            {
              value: '16:9',
              label: '16:9',
              useCase: 'Widescreen, mobile, stories',
            },
            {
              value: '9:16',
              label: '9:16',
              useCase: 'Widescreen, mobile, stories',
            },
            {
              value: '4:3',
              label: '4:3',
              useCase: 'Presentations, portraits',
            },
            {
              value: '3:4',
              label: '3:4',
              useCase: 'Presentations, portraits',
            },
            {
              value: '3:2',
              label: '3:2',
              useCase: 'Photography',
            },
            {
              value: '2:3',
              label: '2:3',
              useCase: 'Photography',
            },
            {
              value: '2:1',
              label: '2:1',
              useCase: 'Banners, headers',
            },
            {
              value: '1:2',
              label: '1:2',
              useCase: 'Banners, headers',
            },
            {
              value: '19.5:9',
              label: '19.5:9',
              useCase: 'Modern smartphone displays',
            },
            {
              value: '9:19.5',
              label: '9:19.5',
              useCase: 'Modern smartphone displays',
            },
            {
              value: '20:9',
              label: '20:9',
              useCase: 'Ultra-wide displays',
            },
            {
              value: '9:20',
              label: '9:20',
              useCase: 'Ultra-wide displays',
            },
          ],
          supportedImageResponseFormats: ['url', 'b64_json'],
          supportedImageResolutions: [
            {
              value: '1k',
              label: '1k',
            },
            {
              value: '2k',
              label: '2k',
            },
          ],
          maxGeneratedImagesPerRequest: 4,
          maxReferenceImagesPerRequest: 5,
          imageDefaults: {
            aspectRatio: 'auto',
            responseFormat: 'url',
            resolution: '1k',
            imageCount: 1,
          },
        },
      },
      {
        id: 'grok-imagine-video',
        displayName: 'Grok Imagine Video',
        capabilities: {
          supportsStreaming: false,
          supportsVideoGeneration: true,
          supportsVideoReferenceImages: true,
          supportsVideoAudioGeneration: false,
          supportedVideoResolutions: [
            {
              value: '480p',
              label: '480p',
            },
            {
              value: '720p',
              label: '720p',
            },
          ],
          supportedVideoDurations: [
            {
              value: 5,
              label: '5 seconds',
            },
            {
              value: 10,
              label: '10 seconds',
            },
            {
              value: 15,
              label: '15 seconds',
            },
          ],
          maxGeneratedVideosPerRequest: 1,
          maxReferenceImagesPerRequest: 7,
          videoDefaults: {
            durationSeconds: 5,
            resolution: '480p',
            videoCount: 1,
          },
          allowedVideoProviderParameters: ['xai'],
        },
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter exposes a normalized image catalog with the expected default model', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ id: 'grok-4-fast' }],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    )) as typeof fetch;

  try {
    const adapter = new XaiProviderAdapterTestDouble();
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'xai-token',
      },
    });

    assert.ok(catalog);
    assert.equal(catalog.providerId, 'xai');
    assert.equal(catalog.defaultModelId, 'grok-imagine-image');
    assert.deepEqual(
      catalog.models.map((model) => model.id),
      ['grok-imagine-image', 'grok-imagine-image-pro'],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter exposes a normalized video catalog with the expected default model', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ id: 'grok-imagine-video' }],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    )) as typeof fetch;

  try {
    const adapter = new XaiProviderAdapterTestDouble();
    const catalog = await adapter.listVideoCatalog?.({
      requestId: 'request-video-catalog',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'xai-token',
      },
    });

    assert.ok(catalog);
    assert.equal(catalog.providerId, 'xai');
    assert.equal(catalog.defaultModelId, 'grok-imagine-video');
    assert.deepEqual(
      catalog.models.map((model) => model.id),
      ['grok-imagine-video'],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter marks the image model with supported aspect ratios', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [{ id: 'grok-imagine-image' }],
      }),
      {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      },
    )) as typeof fetch;

  try {
    const adapter = new XaiProviderAdapterTestDouble();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'xai-token',
      },
    });

    const imagineImageModel = models.find(
      (model) => model.id === 'grok-imagine-image',
    );
    const imagineImageProModel = models.find(
      (model) => model.id === 'grok-imagine-image-pro',
    );
    assert.ok(imagineImageModel);
    assert.equal(imagineImageModel.displayName, 'Grok Imagine Image');
    assert.equal(
      imagineImageModel.capabilities?.supportsImageGeneration,
      true,
    );
    assert.equal(imagineImageModel.capabilities?.supportsImageEditing, true);
    assert.deepEqual(
      imagineImageModel.capabilities?.supportedImageAspectRatios?.map(
        (ratio) => ratio.value,
      ),
      [
        'auto',
        '1:1',
        '16:9',
        '9:16',
        '4:3',
        '3:4',
        '3:2',
        '2:3',
        '2:1',
        '1:2',
        '19.5:9',
        '9:19.5',
        '20:9',
        '9:20',
      ],
    );
    assert.deepEqual(imagineImageModel.capabilities?.supportedImageResolutions, [
      {
        value: '1k',
        label: '1k',
      },
      {
        value: '2k',
        label: '2k',
      },
    ]);
    assert.deepEqual(
      imagineImageModel.capabilities?.supportedImageResponseFormats,
      ['url', 'b64_json'],
    );
    assert.equal(
      imagineImageModel.capabilities?.maxGeneratedImagesPerRequest,
      4,
    );
    assert.equal(
      imagineImageModel.capabilities?.maxReferenceImagesPerRequest,
      5,
    );
    assert.deepEqual(imagineImageModel.capabilities?.imageDefaults, {
      aspectRatio: 'auto',
      responseFormat: 'url',
      resolution: '1k',
      imageCount: 1,
    });

    assert.ok(imagineImageProModel);
    assert.equal(imagineImageProModel.displayName, 'Grok Imagine Image Pro');
    assert.equal(
      imagineImageProModel.capabilities?.supportsImageGeneration,
      true,
    );
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
    const adapter = new XaiProviderAdapterTestDouble();
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

test('XaiProviderAdapter forwards multimodal chat content blocks unchanged', async () => {
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
    const adapter = new XaiProviderAdapterTestDouble();
    await adapter.chat(
      {
        model: 'grok-4-fast',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'What is in this image?',
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
        providerAccess: {
          apiKey: 'xai-token',
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
            text: 'What is in this image?',
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
    const adapter = new XaiProviderAdapterTestDouble();
    const response = await adapter.generateImage?.(
      {
        model: 'grok-imagine-image',
        prompt: 'A studio portrait of a fox astronaut',
        n: 1,
        aspectRatio: '1:1',
        responseFormat: 'url',
        resolution: '2k',
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
      resolution: '2k',
    });
    assert.equal(response?.images[0]?.url, 'https://cdn.x.ai/generated-1.jpg');
    assert.equal(response?.images[0]?.revisedPrompt, 'expanded prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter submits image-to-video requests to the xAI videos endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        request_id: 'video-request-123',
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
    const adapter = new XaiProviderAdapterTestDouble();
    const response = await adapter.submitVideoGeneration?.(
      {
        model: 'grok-imagine-video',
        prompt: 'Animate the portrait with subtle motion',
        durationSeconds: 5,
        resolution: '480p',
        referenceImages: [
          {
            type: 'image_url',
            url: 'https://example.com/reference.png',
          },
        ],
      },
      {
        requestId: 'request-video-submit',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/videos/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'grok-imagine-video',
      prompt: 'Animate the portrait with subtle motion',
      image: {
        url: 'https://example.com/reference.png',
      },
      duration: 5,
      resolution: '480p',
    });
    assert.equal(response?.status, 'queued');
    assert.equal(response?.id, 'video-request-123');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter polls completed video jobs and downloads the provider artifact', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const rawUrl = String(url);
    calls.push({ url: rawUrl, init });

    if (rawUrl === 'https://api.x.ai/v1/videos/video-request-123') {
      return new Response(
        JSON.stringify({
          request_id: 'video-request-123',
          status: 'done',
          model: 'grok-imagine-video',
          video: {
            url: 'https://videos.x.ai/output.mp4',
            duration: 9,
          },
        }),
        {
          status: 200,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    return new Response(new TextEncoder().encode('video-bytes'), {
      status: 200,
      headers: {
        'content-type': 'video/mp4',
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new XaiProviderAdapterTestDouble();
    const job = await adapter.getVideoGenerationJob?.(
      'video-request-123',
      {
        requestId: 'request-video-status',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
        metadata: {
          requestedModel: 'grok-imagine-video',
          prompt: 'Animate the portrait with subtle motion',
        },
      },
    );

    assert.equal(job?.status, 'succeeded');
    assert.equal(job?.outputs[0]?.contentUrl, 'https://videos.x.ai/output.mp4');

    const stream = await adapter.downloadVideoOutput?.(
      'video-request-123',
      0,
      {
        requestId: 'request-video-download',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'xai-token',
        },
        metadata: {
          requestedModel: 'grok-imagine-video',
        },
      },
    );
    const reader = stream?.getReader();
    const firstChunk = await reader?.read();

    assert.match(new TextDecoder().decode(firstChunk?.value), /video-bytes/);
    assert.ok(calls.some((call) => call.url === 'https://api.x.ai/v1/videos/video-request-123'));
    assert.ok(calls.some((call) => call.url === 'https://videos.x.ai/output.mp4'));
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
    const adapter = new XaiProviderAdapterTestDouble();
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
        resolution: '1k',
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
      resolution: '1k',
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

test('XaiProviderAdapter formats image client errors generically', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        code: 'Client specified an invalid argument',
        error:
          'This model supports at most 1 input image(s), but 2 were provided.',
      }),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new XaiProviderAdapterTestDouble();

    await assert.rejects(
      () =>
        adapter.editImage(
          {
            model: 'grok-imagine-image',
            prompt: 'Turn this into a watercolor illustration',
            images: [
              {
                type: 'image_url',
                url: 'https://example.com/reference.png',
              },
              {
                type: 'image_url',
                url: 'https://example.com/reference-2.png',
              },
            ],
            responseFormat: 'b64_json',
          },
          {
            requestId: 'request-4',
            userId: 'user-1',
            providerAccess: {
              apiKey: 'xai-token',
            },
          },
        ),
      /xAI image edit failed with status 400: Client specified an invalid argument\. This model supports at most 1 input image\(s\), but 2 were provided\./,
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/edits');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('XaiProviderAdapter rejects private or local remote image targets before calling xAI', async () => {
  const adapter = new XaiProviderAdapterTestDouble([
    { address: '127.0.0.1', family: 4 },
  ]);

  await assert.rejects(
    () =>
      adapter.editImage(
        {
          model: 'grok-imagine-image',
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
          providerAccess: {
            apiKey: 'xai-token',
          },
        },
      ),
    /cannot resolve to private or local IP ranges/,
  );
});
