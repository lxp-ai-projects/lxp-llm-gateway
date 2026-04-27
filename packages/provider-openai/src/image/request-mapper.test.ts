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
      moderation: 'low',
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
    moderation: 'low',
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
        { type: 'data_url', url: 'data:image/png;base64,abc123' },
        { type: 'data_url', url: 'data:image/jpeg;base64,def456' },
      ],
      resolution: '1024x1536',
      background: 'transparent',
      quality: 'high',
      moderation: 'low',
      outputFormat: 'webp',
      outputCompression: 80,
    },
    model,
    'user-1',
    {
      fetchWithTimeout: async () => {
        throw new Error('unexpected fetch');
      },
      lookupHostname: async () => [],
      timeoutMs: 30_000,
      maxBytes: 50 * 1024 * 1024,
    },
  );

  return request.then((mappedRequest) => {
    assert.equal(mappedRequest.kind, 'multipart');
    assert.equal(mappedRequest.body.get('model'), 'gpt-image-2');
    assert.equal(mappedRequest.body.get('prompt'), 'Edit this image');
    assert.equal(mappedRequest.body.get('background'), 'transparent');
    assert.equal(mappedRequest.body.get('output_format'), 'webp');
    assert.equal(mappedRequest.body.get('output_compression'), '80');
    assert.equal(mappedRequest.body.get('quality'), 'high');
    assert.equal(mappedRequest.body.get('moderation'), 'low');
    assert.equal(mappedRequest.body.get('size'), '1024x1536');
    assert.equal(mappedRequest.body.get('user'), 'user-1');
    assert.equal(mappedRequest.body.getAll('image[]').length, 2);
  });
});
