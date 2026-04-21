import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiProviderAdapter } from './index';

test('OpenAiProviderAdapter lists models from the OpenAI models endpoint and adds image-capable models', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [{ id: 'gpt-4o' }, { id: 'gpt-4.1-mini' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new OpenAiProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'openai-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer openai-token',
    );
    assert.deepEqual(
      models.map((model) => model.id),
      [
        'gpt-4o',
        'gpt-4.1-mini',
        'gpt-image-1.5',
        'gpt-image-1',
        'gpt-image-1-mini',
      ],
    );

    const imageModel = models.find((model) => model.id === 'gpt-image-1.5');
    assert.ok(imageModel);
    assert.equal(imageModel.displayName, 'GPT Image 1.5');
    assert.equal(imageModel.capabilities?.supportsImageGeneration, true);
    assert.equal(imageModel.capabilities?.supportsImageEditing, false);
    assert.deepEqual(imageModel.capabilities?.supportedImageOutputFormats, [
      { value: 'png', label: 'PNG' },
      { value: 'jpeg', label: 'JPEG' },
      { value: 'webp', label: 'WebP' },
    ]);
    assert.deepEqual(imageModel.capabilities?.supportedImageBackgrounds, [
      { value: 'auto', label: 'Auto' },
      { value: 'opaque', label: 'Opaque' },
      { value: 'transparent', label: 'Transparent' },
    ]);
    assert.deepEqual(imageModel.capabilities?.supportedImageInputFidelities, [
      {
        value: 'low',
        label: 'Low',
        description: 'Looser adherence to the reference image.',
      },
      {
        value: 'high',
        label: 'High',
        description: 'Preserve source details more strictly.',
      },
    ]);
    assert.deepEqual(imageModel.capabilities?.imageOutputCompressionRange, {
      min: 0,
      max: 100,
      defaultValue: 100,
      step: 1,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAiProviderAdapter sends chat requests to the OpenAI chat completions endpoint', async () => {
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
              content: 'hello from openai',
            },
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 12,
          total_tokens: 22,
          completion_tokens_details: {
            reasoning_tokens: 4,
          },
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new OpenAiProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'openai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(response.providerId, 'openai');
    assert.equal(response.model, 'gpt-4o');
    assert.equal(response.message.content, 'hello from openai');
    assert.equal(response.usage?.reasoningTokens, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAiProviderAdapter sends image generation requests to the OpenAI images endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        created: 1234,
        data: [
          {
            b64_json: 'generated-base64',
            revised_prompt: 'Refined prompt',
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
    const adapter = new OpenAiProviderAdapter();
    const response = await adapter.generateImage(
      {
        model: 'gpt-image-1.5',
        prompt: 'A transparent product packshot',
        n: 2,
        responseFormat: 'b64_json',
        resolution: '1024x1536',
        background: 'transparent',
        quality: 'high',
        outputFormat: 'webp',
        outputCompression: 80,
      },
      {
        requestId: 'request-image-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'openai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/images/generations');
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'gpt-image-1.5',
      prompt: 'A transparent product packshot',
      n: 2,
      size: '1024x1536',
      response_format: 'b64_json',
      background: 'transparent',
      quality: 'high',
      output_format: 'webp',
      output_compression: 80,
      user: 'user-1',
    });
    assert.equal(response.images[0]?.b64Json, 'generated-base64');
    assert.equal(response.images[0]?.revisedPrompt, 'Refined prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('OpenAiProviderAdapter rejects GPT Image edits because the upstream edits endpoint is not compatible', async () => {
  const adapter = new OpenAiProviderAdapter();

  await assert.rejects(
    () =>
      adapter.editImage(
        {
          model: 'gpt-image-1.5',
          prompt: 'Edit this image',
          images: [
            {
              type: 'image_url',
              url: 'https://example.com/source.png',
            },
          ],
        },
        {
          requestId: 'request-image-4',
          userId: 'user-1',
          providerAccess: { apiKey: 'openai-token' },
        },
      ),
    /temporarily unavailable in the gateway/,
  );
});

test('OpenAiProviderAdapter formats rate limit errors for image requests', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        error: {
          message: 'Rate limit reached for image generation.',
          type: 'rate_limit_exceeded',
          code: 'rate_limit_exceeded',
        },
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json' },
      },
    )) as typeof fetch;

  try {
    const adapter = new OpenAiProviderAdapter();

    await assert.rejects(
      () =>
        adapter.generateImage(
          {
            model: 'gpt-image-1.5',
            prompt: 'A product shot',
          },
          {
            requestId: 'request-image-5',
            userId: 'user-1',
            providerAccess: { apiKey: 'openai-token' },
          },
        ),
      /OpenAI rate limit exceeded \(rate_limit_exceeded\)\. Rate limit reached for image generation\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
