import assert from 'node:assert/strict';
import test from 'node:test';

import { OpenAiImageApiClient } from './api-client.js';
import { OpenAiImageEditService } from './edit-service.js';

test('OpenAiImageEditService orchestrates edit requests end to end', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        created: 1235,
        data: [{ b64_json: 'edited-base64', revised_prompt: 'Refined edit prompt' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new OpenAiImageEditService(
      new OpenAiImageApiClient('https://api.openai.com/v1', 1000),
    );
    const response = await service.execute(
      {
        model: 'gpt-image-2',
        prompt: 'Edit this image',
        images: [
          {
            type: 'data_url',
            url: 'data:image/png;base64,abc123',
            mimeType: 'image/png',
          },
        ],
        background: 'transparent',
        outputFormat: 'webp',
        outputCompression: 80,
        quality: 'high',
        resolution: '1024x1536',
      },
      {
        requestId: 'request-image-4',
        userId: 'user-1',
        providerAccess: { apiKey: 'openai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.openai.com/v1/images/edits');
    assert.equal(response.images[0]?.b64Json, 'edited-base64');
    assert.equal(response.images[0]?.revisedPrompt, 'Refined edit prompt');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
