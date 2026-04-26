import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveOpenAiImageModelDescriptor } from './model-policy.js';
import {
  buildOpenAiImageEditRequest,
  buildOpenAiImageGenerationRequest,
} from './request-mapper.js';

test('buildOpenAiImageGenerationRequest maps canonical generation requests to OpenAI JSON', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-2');
  const request = buildOpenAiImageGenerationRequest(
    {
      model: 'gpt-image-2',
      prompt: 'A chrome hummingbird',
      n: 2,
      resolution: '1024x1536',
      background: 'transparent',
      quality: 'high',
      outputFormat: 'webp',
      outputCompression: 80,
    },
    model,
    'user-1',
  );

  assert.equal(request.kind, 'json');
  assert.deepEqual(request.body, {
    model: 'gpt-image-2',
    prompt: 'A chrome hummingbird',
    n: 2,
    size: '1024x1536',
    background: 'transparent',
    quality: 'high',
    output_format: 'webp',
    output_compression: 80,
    user: 'user-1',
  });
});

test('buildOpenAiImageEditRequest maps canonical edit requests to OpenAI JSON', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-2');
  const request = buildOpenAiImageEditRequest(
    {
      model: 'gpt-image-2',
      prompt: 'Edit this image',
      images: [
        { type: 'image_url', url: 'https://example.com/source.png' },
        { type: 'data_url', url: 'data:image/png;base64,abc123' },
      ],
      resolution: '1024x1536',
      background: 'transparent',
      quality: 'high',
      outputFormat: 'webp',
      outputCompression: 80,
    },
    model,
    'user-1',
  );

  assert.equal(request.kind, 'json');
  assert.deepEqual(request.body, {
    model: 'gpt-image-2',
    prompt: 'Edit this image',
    images: [
      { image_url: 'https://example.com/source.png' },
      { image_url: 'data:image/png;base64,abc123' },
    ],
    background: 'transparent',
    output_format: 'webp',
    output_compression: 80,
    quality: 'high',
    size: '1024x1536',
    user: 'user-1',
  });
});
