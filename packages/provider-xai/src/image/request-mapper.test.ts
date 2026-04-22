import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveXAiImageModelDescriptor } from './model-policy.js';
import {
  buildXAiImageEditRequest,
  buildXAiImageGenerationRequest,
} from './request-mapper.js';

test('buildXAiImageGenerationRequest maps the canonical request to xAI fields', () => {
  const model = resolveXAiImageModelDescriptor('grok-imagine-image');
  const body = buildXAiImageGenerationRequest(
    {
      prompt: 'A product shot',
      n: 2,
      aspectRatio: '1:1',
      responseFormat: 'url',
      resolution: '2k',
    },
    model,
  );

  assert.deepEqual(body, {
    model: 'grok-imagine-image',
    prompt: 'A product shot',
    n: 2,
    aspect_ratio: '1:1',
    response_format: 'url',
    resolution: '2k',
  });
});

test('buildXAiImageEditRequest maps reference images to passthrough URLs', async () => {
  const model = resolveXAiImageModelDescriptor('grok-imagine-image');
  const body = await buildXAiImageEditRequest(
    {
      prompt: 'Edit this image',
      images: [
        { type: 'data_url', url: 'data:image/png;base64,abc123' },
        { type: 'image_url', url: 'https://example.com/reference.png' },
      ],
      responseFormat: 'b64_json',
    },
    model,
    async () => [{ address: '93.184.216.34', family: 4 }],
  );

  assert.deepEqual(body, {
    model: 'grok-imagine-image',
    prompt: 'Edit this image',
    n: undefined,
    aspect_ratio: undefined,
    response_format: 'b64_json',
    resolution: undefined,
    image: undefined,
    images: [
      { type: 'image_url', url: 'data:image/png;base64,abc123' },
      { type: 'image_url', url: 'https://example.com/reference.png' },
    ],
  });
});
