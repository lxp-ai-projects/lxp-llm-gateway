import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleImageApiClient } from './api-client.js';

test('GoogleImageApiClient posts generateContent requests to the native endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  try {
    const client = new GoogleImageApiClient(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      'https://generativelanguage.googleapis.com/v1beta',
      1000,
    );
    await client.postGenerateContent(
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'google-token' },
      },
      'gemini-2.5-flash-image',
      { contents: [] },
    );

    assert.equal(
      calls[0]?.url,
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
