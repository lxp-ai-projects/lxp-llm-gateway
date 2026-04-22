import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleImageApiClient } from './api-client.js';
import { GoogleImageEditService } from './edit-service.js';

test('GoogleImageEditService orchestrates edit requests end to end', async () => {
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
                    data: 'edited-base64',
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
    const service = new GoogleImageEditService(
      new GoogleImageApiClient(
        'https://generativelanguage.googleapis.com/v1beta/openai',
        'https://generativelanguage.googleapis.com/v1beta',
        1000,
      ),
      async () => [{ address: '93.184.216.34', family: 4 }],
      1000,
      1024 * 1024,
    );
    const response = await service.execute(
      {
        model: 'gemini-2.5-flash-image',
        prompt: 'Edit this image',
        images: [{ type: 'data_url', url: 'data:image/png;base64,abc123' }],
        responseFormat: 'b64_json',
      },
      {
        requestId: 'request-2',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
    );

    assert.equal(response.images[0]?.b64Json, 'edited-base64');
    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
