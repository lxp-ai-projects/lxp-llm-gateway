import assert from 'node:assert/strict';
import { Buffer } from 'node:buffer';
import test from 'node:test';

import { resolveGoogleImageModelDescriptor } from './model-policy.js';
import {
  buildGoogleImageEditRequest,
  buildGoogleImageGenerationRequest,
} from './request-mapper.js';

test('buildGoogleImageGenerationRequest maps the canonical request to Gemini generateContent', async () => {
  const model = resolveGoogleImageModelDescriptor('gemini-3-pro-image-preview');
  const body = await buildGoogleImageGenerationRequest(
    {
      prompt: 'A product shot',
      n: 2,
      aspectRatio: '4:5',
      resolution: '4K',
      responseFormat: 'b64_json',
    },
    model,
  );

  assert.deepEqual(body, {
    contents: [
      {
        role: 'user',
        parts: [{ text: 'A product shot' }],
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
});

test('buildGoogleImageEditRequest inlines remote image references as base64 parts', async () => {
  const model = resolveGoogleImageModelDescriptor('gemini-2.5-flash-image');
  const body = await buildGoogleImageEditRequest(
    {
      prompt: 'Edit this image',
      images: [{ type: 'image_url', url: 'https://example.com/reference.png' }],
      responseFormat: 'b64_json',
    },
    model,
    {
      lookupHostname: async () => [{ address: '93.184.216.34', family: 4 }],
      fetchWithTimeout: async () =>
        new Response(Buffer.from('remote-image-bytes'), {
          status: 200,
          headers: {
            'content-type': 'image/png',
            'content-length': String(Buffer.byteLength('remote-image-bytes')),
          },
        }),
      timeoutMs: 1000,
      maxInlineReferenceBytes: 1024 * 1024,
    },
  );

  assert.deepEqual(body, {
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
      candidateCount: undefined,
      imageConfig: {
        aspectRatio: undefined,
        imageSize: undefined,
      },
    },
  });
});
