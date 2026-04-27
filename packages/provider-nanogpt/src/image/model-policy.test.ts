import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveNanoGptImageModelDescriptor,
  validateNanoGptImageEditRequest,
  validateNanoGptImageGenerationRequest,
} from './model-policy.js';

test('resolveNanoGptImageModelDescriptor applies Seedream 4.x capability overrides', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seedream-4-0-250828');

  assert.equal(descriptor.id, 'seedream-4-0-250828');
  assert.equal(descriptor.capabilities.supportsImageEditing, true);
  assert.equal(descriptor.capabilities.maxGeneratedImagesPerRequest, 15);
  assert.equal(descriptor.capabilities.maxReferenceImagesPerRequest, 10);
});

test('validateNanoGptImageGenerationRequest rejects unsupported Seedream 3.0 image counts', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seedream-3-0-t2i-250415');

  assert.throws(
    () =>
      validateNanoGptImageGenerationRequest(
        {
          prompt: 'A poster',
          n: 2,
        },
        descriptor,
      ),
    /supports at most 1 image\(s\) per request/,
  );
});

test('validateNanoGptImageEditRequest rejects generation-only Seedream 3.0', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seedream-3-0-t2i-250415');

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Edit this',
          images: [{ type: 'image_url', url: 'https://example.com/source.png' }],
        },
        descriptor,
      ),
    /does not support editing/,
  );
});

test('validateNanoGptImageEditRequest enforces the Seedream combined reference and output limit', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seedream-4-0-250828');

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Create a storyboard set',
          n: 14,
          images: [
            { type: 'image_url', url: 'https://example.com/reference.png' },
            { type: 'image_url', url: 'https://example.com/style.png' },
          ],
        },
        descriptor,
      ),
    /supports at most 15 combined reference and output image\(s\)/,
  );
});

test('validateNanoGptImageEditRequest classifies SeedEdit 3.0 as single-reference edit-only', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seededit-3-0-i2i-250628');

  assert.throws(
    () =>
      validateNanoGptImageGenerationRequest(
        {
          prompt: 'Generate from scratch',
        },
        descriptor,
      ),
    /does not support generation/,
  );

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Edit this image',
          images: [
            { type: 'image_url', url: 'https://example.com/one.png' },
            { type: 'image_url', url: 'https://example.com/two.png' },
          ],
        },
        descriptor,
      ),
    /supports at most 1 reference image/,
  );
});

test('validateNanoGptImageEditRequest enforces the Seedream combined limit for alias ids', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('seedream-4.5');

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Create a set',
          n: 15,
          images: [{ type: 'image_url', url: 'https://example.com/reference.png' }],
        },
        descriptor,
      ),
    /supports at most 15 combined reference and output image\(s\)/,
  );
});
