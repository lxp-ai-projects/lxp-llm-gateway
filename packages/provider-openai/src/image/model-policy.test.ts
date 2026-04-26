import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveOpenAiImageModelDescriptor,
  validateOpenAiImageEditRequest,
  validateOpenAiImageGenerationRequest,
} from './model-policy.js';

test('resolveOpenAiImageModelDescriptor returns the catalog entry for GPT Image 2', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-2');

  assert.equal(model.id, 'gpt-image-2');
  assert.equal(model.lifecycleStatus, 'active');
  assert.equal(model.capabilities.supportsImageEditing, true);
});

test('validateOpenAiImageGenerationRequest rejects unsupported response formats', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-1.5');

  assert.throws(
    () =>
      validateOpenAiImageGenerationRequest(
        {
          model: 'gpt-image-1.5',
          prompt: 'A product shot',
          responseFormat: 'url',
        },
        model,
      ),
    /does not support response format url/,
  );
});

test('validateOpenAiImageEditRequest rejects too many reference images', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-2');

  assert.throws(
    () =>
      validateOpenAiImageEditRequest(
        {
          model: 'gpt-image-2',
          prompt: 'Edit this image',
          images: [
            { type: 'image_url', url: 'https://example.com/one.png' },
            { type: 'image_url', url: 'https://example.com/two.png' },
            { type: 'image_url', url: 'https://example.com/three.png' },
            { type: 'image_url', url: 'https://example.com/four.png' },
            { type: 'image_url', url: 'https://example.com/five.png' },
            { type: 'image_url', url: 'https://example.com/six.png' },
            { type: 'image_url', url: 'https://example.com/seven.png' },
            { type: 'image_url', url: 'https://example.com/eight.png' },
            { type: 'image_url', url: 'https://example.com/nine.png' },
            { type: 'image_url', url: 'https://example.com/ten.png' },
            { type: 'image_url', url: 'https://example.com/eleven.png' },
            { type: 'image_url', url: 'https://example.com/twelve.png' },
            { type: 'image_url', url: 'https://example.com/thirteen.png' },
            { type: 'image_url', url: 'https://example.com/fourteen.png' },
            { type: 'image_url', url: 'https://example.com/fifteen.png' },
            { type: 'image_url', url: 'https://example.com/sixteen.png' },
            { type: 'image_url', url: 'https://example.com/seventeen.png' },
          ],
        },
        model,
      ),
    /supports at most 16 reference image/,
  );
});

test('validateOpenAiImageEditRequest rejects input fidelity for GPT Image 2', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-2');

  assert.throws(
    () =>
      validateOpenAiImageEditRequest(
        {
          model: 'gpt-image-2',
          prompt: 'Edit this image',
          images: [{ type: 'image_url', url: 'https://example.com/one.png' }],
          inputFidelity: 'high',
        },
        model,
      ),
    /does not support input fidelity high/,
  );
});
