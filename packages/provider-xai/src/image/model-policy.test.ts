import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveXAiImageModelDescriptor,
  validateXAiImageEditRequest,
  validateXAiImageGenerationRequest,
} from './model-policy.js';

test('resolveXAiImageModelDescriptor returns the default xAI image model', () => {
  const descriptor = resolveXAiImageModelDescriptor();

  assert.equal(descriptor.id, 'grok-imagine-image');
  assert.equal(descriptor.capabilities.supportsImageEditing, true);
});

test('resolveXAiImageModelDescriptor keeps the documented multi-image edit limit for Grok Imagine Pro', () => {
  const descriptor = resolveXAiImageModelDescriptor('grok-imagine-image-pro');

  assert.equal(descriptor.capabilities.maxReferenceImagesPerRequest, 5);
});

test('validateXAiImageGenerationRequest rejects unsupported image counts', () => {
  const descriptor = resolveXAiImageModelDescriptor('grok-imagine-image');

  assert.throws(
    () =>
      validateXAiImageGenerationRequest(
        {
          prompt: 'A studio portrait',
          n: 5,
        },
        descriptor,
      ),
    /supports at most 4 image\(s\) per request/,
  );
});

test('validateXAiImageEditRequest requires at least one reference image', () => {
  const descriptor = resolveXAiImageModelDescriptor('grok-imagine-image');

  assert.throws(
    () =>
      validateXAiImageEditRequest(
        {
          prompt: 'Edit this image',
          images: [],
        },
        descriptor,
      ),
    /requires at least one reference image/,
  );
});
