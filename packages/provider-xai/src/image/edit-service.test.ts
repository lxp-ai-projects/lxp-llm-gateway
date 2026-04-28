import assert from 'node:assert/strict';
import test from 'node:test';

import { XAiImageApiClient } from './api-client.js';
import { XAiImageEditService } from './edit-service.js';

test('XAiImageEditService orchestrates edit requests end to end', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(
      JSON.stringify({
        data: [{ b64_json: 'edited-image' }],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const service = new XAiImageEditService(
      new XAiImageApiClient('https://api.x.ai/v1', 1000),
      async () => [{ address: '93.184.216.34', family: 4 }],
    );
    const response = await service.execute(
      {
        model: 'grok-imagine-image',
        prompt: 'Edit this image',
        images: [{ type: 'image_url', url: 'https://example.com/source.png' }],
        responseFormat: 'b64_json',
      },
      {
        requestId: 'request-2',
        userId: 'user-1',
        providerAccess: { apiKey: 'xai-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.x.ai/v1/images/edits');
    assert.equal(response.images[0]?.b64Json, 'edited-image');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
