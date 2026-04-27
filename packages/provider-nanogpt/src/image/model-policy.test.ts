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

test('validateNanoGptImageGenerationRequest allows 4K for Wan 2.7 Image Pro generation', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('wan-2.7-image-pro');

  assert.doesNotThrow(() =>
    validateNanoGptImageGenerationRequest(
      {
        prompt: 'A cinematic landscape',
        resolution: '4K',
      },
      descriptor,
    ),
  );
});

test('validateNanoGptImageEditRequest rejects 4K for Wan 2.7 Image Pro editing', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('wan-2.7-image-pro');

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Edit this image',
          resolution: '4K',
          images: [{ type: 'image_url', url: 'https://example.com/source.png' }],
        },
        descriptor,
      ),
    /does not support resolution 4K/,
  );
});

test('resolveNanoGptImageModelDescriptor aligns Nano Banana with Google Gemini image options', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('nano-banana');

  assert.deepEqual(
    descriptor.capabilities.supportedImageAspectRatios?.map((entry) => entry.value),
    ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'],
  );
  assert.deepEqual(descriptor.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(descriptor.capabilities.supportedImageResolutions, [
    { value: '1K', label: '1K' },
  ]);
  assert.equal(descriptor.capabilities.imageDefaults?.aspectRatio, '1:1');
  assert.equal(descriptor.capabilities.imageDefaults?.resolution, '1K');
});

test('resolveNanoGptImageModelDescriptor aligns Nano Banana 2 with Google Gemini image options', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('nano-banana-2');

  assert.deepEqual(descriptor.capabilities.supportedImageResolutions, [
    { value: '512', label: '512' },
    { value: '1K', label: '1K' },
    { value: '2K', label: '2K' },
    { value: '4K', label: '4K' },
  ]);
  assert.equal(descriptor.capabilities.imageDefaults?.aspectRatio, '1:1');
  assert.equal(descriptor.capabilities.imageDefaults?.resolution, '512');
  assert.equal(descriptor.capabilities.maxReferenceImagesPerRequest, 14);
});

test('validateNanoGptImageGenerationRequest rejects unsupported Nano Banana aspect ratios', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('nano-banana');

  assert.throws(
    () =>
      validateNanoGptImageGenerationRequest(
        {
          prompt: 'A product shot',
          aspectRatio: '7:1',
        },
        descriptor,
      ),
    /does not support aspect ratio 7:1/,
  );
});

test('resolveNanoGptImageModelDescriptor aligns GPT Image 1 with OpenAI image options', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('gpt-image-1');

  assert.deepEqual(descriptor.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(descriptor.capabilities.supportedImageResolutions, [
    { value: 'auto', label: 'Auto' },
    { value: '1024x1024', label: '1024x1024' },
    { value: '1536x1024', label: '1536x1024' },
    { value: '1024x1536', label: '1024x1536' },
  ]);
  assert.deepEqual(
    descriptor.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageQualities?.map((entry) => entry.value),
    ['auto', 'low', 'medium', 'high'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageInputFidelities?.map((entry) => entry.value),
    ['low', 'high'],
  );
});

test('resolveNanoGptImageModelDescriptor aligns GPT Image 1.5 alias ids with OpenAI image options', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('gpt-image-1_5');

  assert.deepEqual(descriptor.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(
    descriptor.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageQualities?.map((entry) => entry.value),
    ['auto', 'low', 'medium', 'high'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
});

test('resolveNanoGptImageModelDescriptor aligns GPT Image 2 with OpenAI image options', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('gpt-image-2');

  assert.deepEqual(descriptor.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(
    descriptor.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageQualities?.map((entry) => entry.value),
    ['auto', 'low', 'medium', 'high'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    descriptor.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
});

test('resolveNanoGptImageModelDescriptor aligns GPT Image Mini and ChatGPT image aliases with OpenAI image options', () => {
  const miniDescriptor = resolveNanoGptImageModelDescriptor('gpt image 1 mini');
  const latestDescriptor = resolveNanoGptImageModelDescriptor('chatgpt image latest');

  assert.deepEqual(miniDescriptor.capabilities.supportedImageResponseFormats, ['b64_json']);
  assert.deepEqual(
    miniDescriptor.capabilities.supportedImageModerations?.map((entry) => entry.value),
    ['auto', 'low'],
  );
  assert.deepEqual(
    latestDescriptor.capabilities.supportedImageBackgrounds?.map((entry) => entry.value),
    ['auto', 'opaque', 'transparent'],
  );
  assert.deepEqual(
    latestDescriptor.capabilities.supportedImageOutputFormats?.map((entry) => entry.value),
    ['png', 'jpeg', 'webp'],
  );
});

test('validateNanoGptImageGenerationRequest rejects unsupported GPT image response formats', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('gpt-image-1');

  assert.throws(
    () =>
      validateNanoGptImageGenerationRequest(
        {
          prompt: 'A product shot',
          responseFormat: 'url',
        },
        descriptor,
      ),
    /does not support response format url/,
  );
});

test('validateNanoGptImageEditRequest rejects unsupported GPT image moderation values', () => {
  const descriptor = resolveNanoGptImageModelDescriptor('gpt-image-1');

  assert.throws(
    () =>
      validateNanoGptImageEditRequest(
        {
          prompt: 'Edit this image',
          moderation: 'strict',
          images: [{ type: 'image_url', url: 'https://example.com/source.png' }],
        },
        descriptor,
      ),
    /does not support moderation strict/,
  );
});
