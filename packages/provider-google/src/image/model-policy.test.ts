import assert from 'node:assert/strict';
import test from 'node:test';

import {
  resolveGoogleImageModelDescriptor,
  validateGoogleImageEditRequest,
  validateGoogleImageGenerationRequest,
} from './model-policy.js';

test('resolveGoogleImageModelDescriptor returns the default Google image model', () => {
  const descriptor = resolveGoogleImageModelDescriptor();

  assert.equal(descriptor.id, 'gemini-2.5-flash-image');
  assert.equal(descriptor.capabilities.supportsImageEditing, true);
});

test('resolveGoogleImageModelDescriptor exposes the Gemini 3 multi-reference limit', () => {
  const descriptor = resolveGoogleImageModelDescriptor(
    'gemini-3.1-flash-image-preview',
  );

  assert.equal(descriptor.capabilities.maxReferenceImagesPerRequest, 14);
});

test('validateGoogleImageGenerationRequest rejects unsupported response formats', () => {
  const descriptor = resolveGoogleImageModelDescriptor('gemini-2.5-flash-image');

  assert.throws(
    () =>
      validateGoogleImageGenerationRequest(
        {
          prompt: 'A product shot',
          responseFormat: 'url',
        },
        descriptor,
      ),
    /does not support response format url/,
  );
});

test('validateGoogleImageEditRequest requires at least one reference image', () => {
  const descriptor = resolveGoogleImageModelDescriptor('gemini-2.5-flash-image');

  assert.throws(
    () =>
      validateGoogleImageEditRequest(
        {
          prompt: 'Edit this image',
          images: [],
        },
        descriptor,
      ),
    /requires at least one reference image/,
  );
});
