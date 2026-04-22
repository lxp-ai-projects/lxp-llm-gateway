import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiImageApiClient } from './api-client.js';
import { OpenAiImageGenerationService } from './generation-service.js';

test('OpenAiImageGenerationService orchestrates request validation, transport, and response mapping', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        created: 1234,
        data: [{ b64_json: 'generated-base64', revised_prompt: 'Refined prompt' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new OpenAiImageGenerationService(
      new OpenAiImageApiClient('https://api.openai.com/v1', 1000),
    );
    const response = await service.execute(
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
    assert.equal(response.images[0]?.b64Json, 'generated-base64');
    assert.equal(response.images[0]?.revisedPrompt, 'Refined prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
