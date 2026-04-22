import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveOpenAiImageModelDescriptor,
  validateOpenAiImageEditRequest,
  validateOpenAiImageGenerationRequest,
} from './model-policy.js';

test('resolveOpenAiImageModelDescriptor returns the catalog entry for GPT Image 1.5', () => {
  const model = resolveOpenAiImageModelDescriptor('gpt-image-1.5');

  assert.equal(model.id, 'gpt-image-1.5');
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
  const model = resolveOpenAiImageModelDescriptor('gpt-image-1.5');

  assert.throws(
    () =>
      validateOpenAiImageEditRequest(
        {
          model: 'gpt-image-1.5',
          prompt: 'Edit this image',
          images: [
            { type: 'image_url', url: 'https://example.com/one.png' },
            { type: 'image_url', url: 'https://example.com/two.png' },
            { type: 'image_url', url: 'https://example.com/three.png' },
            { type: 'image_url', url: 'https://example.com/four.png' },
            { type: 'image_url', url: 'https://example.com/five.png' },
            { type: 'image_url', url: 'https://example.com/six.png' },
          ],
        },
        model,
      ),
    /supports at most 5 reference image/,
  );
});
