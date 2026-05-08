import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenRouterProviderAdapter } from './index';
import { buildOpenRouterVideoGenerationRequest } from './video/request-mapper.js';

test('OpenRouterProviderAdapter sends an OpenAI-compatible chat completions request', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        id: 'openrouter-1',
        object: 'chat.completion',
        created: 1776224483,
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'hello from openrouter',
            },
          },
        ],
        usage: {
          prompt_tokens: 11,
          completion_tokens: 7,
          total_tokens: 18,
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
    const adapter = new OpenRouterProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'openai/gpt-4.1-mini',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers.authorization, 'Bearer openrouter-secret-token');
    assert.equal(response.message.content, 'hello from openrouter');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter forwards GLM thinking controls through reasoning', async () => {
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
              content: 'hello from openrouter glm',
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
    const adapter = new OpenRouterProviderAdapter();
    await adapter.chat(
      {
        model: 'z-ai/glm-4.5',
        maxOutputTokens: 4096,
        providerOptions: {
          openrouter: {
            reasoning: {
              enabled: true,
            },
          },
        },
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'req-openrouter-glm',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      max_tokens?: number;
      reasoning?: {
        enabled?: boolean;
      };
    };
    assert.equal(body.max_tokens, 4096);
    assert.deepEqual(body.reasoning, {
      enabled: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter forwards multimodal chat content blocks unchanged', async () => {
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
              content: 'hello from openrouter',
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
    const adapter = new OpenRouterProviderAdapter();
    await adapter.chat(
      {
        model: 'openai/gpt-4.1-mini',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Summarize this image.',
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
          apiKey: 'openrouter-secret-token',
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
            text: 'Summarize this image.',
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

test('OpenRouterProviderAdapter respects a credential-level baseUrl override', async () => {
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
    const adapter = new OpenRouterProviderAdapter();
    await adapter.listModels?.({
      requestId: 'req-2',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'openrouter-secret-token',
        baseUrl: 'https://custom-openrouter.example/v1',
      },
    });

    assert.equal(calls[0]?.url, 'https://custom-openrouter.example/v1/models');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter exposes an image catalog with reused provider options', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            id: 'google/gemini-3.1-flash-image-preview',
            name: 'Google: Nano Banana 2 (Gemini 3.1 Flash Image Preview)',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image', 'text'],
            },
          },
          {
            id: 'openai/gpt-5-image',
            name: 'OpenAI: GPT-5 Image',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image', 'text'],
            },
          },
          {
            id: 'black-forest-labs/flux.2-pro',
            name: 'Black Forest Labs: FLUX.2 Pro',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image'],
            },
          },
          {
            id: 'sourceful/riverflow-v2-fast',
            name: 'Sourceful: Riverflow V2 Fast',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image'],
            },
          },
          {
            id: 'sourceful/riverflow-v2-max-preview',
            name: 'Sourceful: Riverflow V2 Max Preview',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image'],
            },
          },
          {
            id: 'black-forest-labs/flux.2-flex',
            name: 'Black Forest Labs: FLUX.2 Flex',
            architecture: {
              input_modalities: ['text', 'image'],
              output_modalities: ['image'],
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
    const adapter = new OpenRouterProviderAdapter();
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'req-image-catalog',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'openrouter-secret-token',
      },
    });

    assert.ok(catalog);
    assert.equal(catalog?.providerId, 'openrouter');
    assert.equal(catalog?.defaultModelId, 'google/gemini-3.1-flash-image-preview');

    const geminiModel = catalog?.models.find(
      (model) => model.id === 'google/gemini-3.1-flash-image-preview',
    );
    assert.ok(geminiModel);
    assert.equal(geminiModel?.capabilities.supportsImageGeneration, true);
    assert.equal(geminiModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      geminiModel?.capabilities.supportedImageResolutions?.some(
        (option) => option.value === '512',
      ),
    );
    assert.equal(
      geminiModel?.capabilities.supportedImageAspectRatios?.some(
        (option) => option.value === '1:8',
      ),
      false,
    );

    const openAiModel = catalog?.models.find(
      (model) => model.id === 'openai/gpt-5-image',
    );
    assert.ok(openAiModel);
    assert.equal(openAiModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      openAiModel?.capabilities.supportedImageOutputFormats?.some(
        (option) => option.value === 'webp',
      ),
    );
    assert.ok(
      openAiModel?.capabilities.supportedImageInputFidelities?.some(
        (option) => option.value === 'high',
      ),
    );

    const genericModel = catalog?.models.find(
      (model) => model.id === 'black-forest-labs/flux.2-pro',
    );
    assert.ok(genericModel);
    assert.deepEqual(genericModel?.capabilities.supportedImageResponseFormats, ['b64_json']);
    assert.equal(genericModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      genericModel?.capabilities.supportedImageResolutions?.some(
        (option) => option.value === '4MP',
      ),
    );

    const riverflowModel = catalog?.models.find(
      (model) => model.id === 'sourceful/riverflow-v2-fast',
    );
    assert.ok(riverflowModel);
    assert.equal(riverflowModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      riverflowModel?.capabilities.supportedImageResolutions?.some(
        (option) => option.value === '2K',
      ),
    );

    const riverflowPreviewModel = catalog?.models.find(
      (model) => model.id === 'sourceful/riverflow-v2-max-preview',
    );
    assert.ok(riverflowPreviewModel);
    assert.equal(riverflowPreviewModel?.lifecycleStatus, 'preview');
    assert.equal(riverflowPreviewModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      riverflowPreviewModel?.capabilities.supportedImageResolutions?.some(
        (option) => option.value === '4K',
      ),
    );

    const fluxFlexModel = catalog?.models.find(
      (model) => model.id === 'black-forest-labs/flux.2-flex',
    );
    assert.ok(fluxFlexModel);
    assert.equal(fluxFlexModel?.capabilities.supportsImageEditing, true);
    assert.ok(
      fluxFlexModel?.capabilities.supportedImageResolutions?.some(
        (option) => option.value === '4MP',
      ),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter falls back to the known image catalog when remote discovery fails', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response('catalog unavailable', {
      status: 401,
      headers: {
        'content-type': 'text/plain',
      },
    })) as typeof fetch;

  try {
    const adapter = new OpenRouterProviderAdapter();
    const catalog = await adapter.listImageCatalog?.({
      requestId: 'req-image-catalog-fallback',
      userId: 'user-1',
      providerAccess: {},
    });

    assert.ok(catalog);
    assert.equal(catalog?.providerId, 'openrouter');
    assert.equal(catalog?.defaultModelId, 'google/gemini-2.5-flash-image');
    assert.ok(
      catalog?.models.some((model) => model.id === 'openai/gpt-5-image'),
    );
    assert.ok(
      catalog?.models.some((model) => model.id === 'openrouter/auto'),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter sends image generation through chat completions with image_config', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        id: 'openrouter-image-1',
        created: 1776224483,
        model: 'openai/gpt-5-image',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'Generated the image.',
              images: [
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,aGVsbG8=',
                  },
                },
              ],
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
    const adapter = new OpenRouterProviderAdapter();
    const response = await adapter.generateImage?.(
      {
        model: 'openai/gpt-5-image',
        prompt: 'Generate a sunset over mountains',
        aspectRatio: '16:9',
        resolution: '1024x1024',
        quality: 'high',
        background: 'transparent',
        outputFormat: 'png',
        outputCompression: 80,
        moderation: 'auto',
      },
      {
        requestId: 'req-image-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');

    const payload = JSON.parse(String(calls[0]?.init?.body)) as {
      modalities: string[];
      image_config?: Record<string, unknown>;
    };
    assert.deepEqual(payload.modalities, ['image', 'text']);
    assert.deepEqual(payload.image_config, {
      aspect_ratio: '16:9',
      size: '1024x1024',
      background: 'transparent',
      quality: 'high',
      moderation: 'auto',
      output_format: 'png',
      output_compression: 80,
    });

    assert.ok(response);
    assert.equal(response?.providerId, 'openrouter');
    assert.equal(response?.images[0]?.b64Json, 'aGVsbG8=');
    assert.equal(response?.images[0]?.mimeType, 'image/png');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter sends image edit requests through chat completions with image content', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    return new Response(
      JSON.stringify({
        id: 'openrouter-image-edit-1',
        created: 1776224484,
        model: 'openai/gpt-5-image',
        choices: [
          {
            finish_reason: 'stop',
            message: {
              role: 'assistant',
              content: 'Edited the image.',
              images: [
                {
                  type: 'image_url',
                  image_url: {
                    url: 'data:image/png;base64,d29ybGQ=',
                  },
                },
              ],
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
    const adapter = new OpenRouterProviderAdapter();
    const response = await adapter.editImage?.(
      {
        model: 'openai/gpt-5-image',
        prompt: 'Make the sky warmer and more dramatic',
        images: [
          {
            type: 'data_url',
            url: 'data:image/png;base64,aGVsbG8=',
            mimeType: 'image/png',
          },
        ],
        inputFidelity: 'high',
        outputFormat: 'png',
      },
      {
        requestId: 'req-image-edit-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/chat/completions');

    const payload = JSON.parse(String(calls[0]?.init?.body)) as {
      modalities: string[];
      image_config?: Record<string, unknown>;
      messages: Array<{
        content: Array<
          | { type: 'text'; text: string }
          | { type: 'image_url'; image_url: { url: string } }
        >;
      }>;
    };
    assert.deepEqual(payload.modalities, ['image', 'text']);
    assert.equal(payload.image_config?.input_fidelity, 'high');
    assert.equal(payload.image_config?.output_format, 'png');
    assert.equal(payload.messages[0]?.content[0]?.type, 'text');
    assert.equal(payload.messages[0]?.content[1]?.type, 'image_url');
    assert.equal(
      payload.messages[0]?.content[1]?.image_url.url,
      'data:image/png;base64,aGVsbG8=',
    );

    assert.ok(response);
    assert.equal(response?.providerId, 'openrouter');
    assert.equal(response?.images[0]?.b64Json, 'd29ybGQ=');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter exposes a video catalog', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        data: [
          {
            id: 'kling/kling-2.1-master',
            canonical_slug: 'kling-2.1-master',
            name: 'Kling 2.1 Master',
            generate_audio: true,
            supported_aspect_ratios: ['16:9', '9:16'],
            supported_durations: [5, 10],
            supported_frame_images: ['first_frame', 'last_frame'],
            supported_resolutions: ['720p', '1080p'],
            supported_sizes: null,
            allowed_passthrough_parameters: ['seed'],
            pricing_skus: {
              generate: '0.80',
            },
          },
          {
            id: 'google/veo-3.1',
            name: 'Veo 3.1',
            generate_audio: true,
            supported_aspect_ratios: ['16:9'],
            supported_durations: [5, 8],
            supported_frame_images: ['first_frame', 'last_frame'],
            supported_resolutions: ['720p'],
            supported_sizes: null,
            allowed_passthrough_parameters: ['seed'],
            pricing_skus: {
              generate: '0.50',
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
    const adapter = new OpenRouterProviderAdapter();
    const catalog = await adapter.listVideoCatalog?.({
      requestId: 'req-video-catalog',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'openrouter-secret-token',
      },
    });

    assert.ok(catalog);
    assert.equal(catalog?.providerId, 'openrouter');
    assert.equal(catalog?.defaultModelId, 'kling/kling-2.1-master');
    assert.equal(catalog?.models[0]?.capabilities.supportsVideoGeneration, true);
    assert.equal(catalog?.models[0]?.capabilities.supportsVideoAudioGeneration, false);
    assert.ok(
      catalog?.models[0]?.capabilities.capabilityDiagnostics?.some(
        (diagnostic) => diagnostic.code === 'provider_claims_capability_unknown_to_native_spec',
      ),
    );
    assert.deepEqual(
      catalog?.models[0]?.capabilities.supportedVideoFrameTypes,
      ['first_frame', 'last_frame'],
    );
    assert.equal(catalog?.models[0]?.family?.profileId, 'kling-video-family');
    assert.equal(catalog?.models[0]?.capabilities.family?.familyId, 'kling');
    assert.deepEqual(
      catalog?.models[0]?.family?.video?.durationConstraint?.allowedValues,
      [5, 10],
    );

    const nonKlingModel = catalog?.models.find((model) => model.id === 'google/veo-3.1');
    assert.ok(nonKlingModel);
    assert.equal(nonKlingModel?.family, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouterProviderAdapter submits and polls a video generation job', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  globalThis.fetch = (async (url, init) => {
    calls.push({
      url: String(url),
      init,
    });

    if (String(url).endsWith('/videos')) {
      return new Response(
        JSON.stringify({
          id: 'job-abc123',
          polling_url: '/api/v1/videos/job-abc123',
          status: 'pending',
          generation_id: 'gen-xyz789',
        }),
        {
          status: 202,
          headers: {
            'content-type': 'application/json',
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        id: 'job-abc123',
        polling_url: '/api/v1/videos/job-abc123',
        status: 'completed',
        generation_id: 'gen-xyz789',
        unsigned_urls: ['https://provider.example/video.mp4'],
        usage: {
          cost: 0.5,
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
    const adapter = new OpenRouterProviderAdapter();
    const submitted = await adapter.submitVideoGeneration?.(
      {
        model: 'google/veo-3.1',
        prompt: 'Animate this product photo into a reveal shot',
        durationSeconds: 5,
        aspectRatio: '16:9',
        resolution: '720p',
        referenceImages: [
          {
            type: 'image_url',
            url: 'https://example.com/reference.png',
          },
        ],
      },
      {
        requestId: 'req-video-submit',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'openrouter-secret-token',
        },
      },
    );

    assert.ok(submitted);
    assert.equal(submitted?.status, 'queued');
    assert.equal(calls[0]?.url, 'https://openrouter.ai/api/v1/videos');

    const payload = JSON.parse(String(calls[0]?.init?.body ?? '{}')) as {
      duration?: number;
      aspect_ratio?: string;
      resolution?: string;
      input_references?: Array<{ image_url: { url: string } }>;
    };
    assert.equal(payload.duration, 5);
    assert.equal(payload.aspect_ratio, '16:9');
    assert.equal(payload.resolution, '720p');
    assert.equal(
      payload.input_references?.[0]?.image_url.url,
      'https://example.com/reference.png',
    );

    const polled = await adapter.getVideoGenerationJob?.('job-abc123', {
      requestId: 'req-video-submit',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'openrouter-secret-token',
      },
      metadata: {
        requestedModel: 'google/veo-3.1',
        prompt: 'Animate this product photo into a reveal shot',
      },
    });

    assert.ok(polled);
    assert.equal(polled?.status, 'succeeded');
    assert.equal(polled?.outputs[0]?.contentUrl, 'https://provider.example/video.mp4');
    assert.equal(
      (polled?.providerMetadata?.usage as { cost?: number } | undefined)?.cost,
      0.5,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenRouter video transport mapping remains independent from model family metadata', async () => {
  const payload = await buildOpenRouterVideoGenerationRequest({
    model: 'kling/kling-2.1-master',
    prompt: 'Animate the still frame into a cinematic reveal',
    durationSeconds: 5,
    aspectRatio: '16:9',
    resolution: '720p',
    providerOptions: {
      seed: 1234,
    },
    referenceImages: [
      {
        type: 'image_url',
        url: 'https://example.com/reference.png',
      },
    ],
  });

  assert.deepEqual(payload, {
    model: 'kling/kling-2.1-master',
    prompt: 'Animate the still frame into a cinematic reveal',
    aspect_ratio: '16:9',
    duration: 5,
    resolution: '720p',
    input_references: [
      {
        image_url: {
          url: 'https://example.com/reference.png',
        },
      },
    ],
    provider: {
      seed: 1234,
    },
  });
});

