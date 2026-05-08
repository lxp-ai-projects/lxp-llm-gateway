import assert from 'node:assert/strict';
import test from 'node:test';

import { attachKlingVideoFamilyToModel, buildKlingVideoFamilyProfile, validateKlingVideoRequest } from './kling-video-family.js';

test('Kling family profile exposes the expected video modes', () => {
  const profile = buildKlingVideoFamilyProfile();

  assert.deepEqual(profile.video?.generationModes, [
    'text-to-video',
    'image-to-video',
    'multi-image-to-video',
    'video-extension',
    'lip-sync',
  ]);
});

test('Kling family profile validates a supported image-to-video request', () => {
  const profile = buildKlingVideoFamilyProfile();
  const result = validateKlingVideoRequest(
    {
      model: 'openrouter/kling-v1',
      prompt: 'Animate this still frame',
      durationSeconds: 5,
      aspectRatio: '16:9',
      resolution: '720p',
      referenceImages: [{ type: 'image_url', url: 'https://example.com/shot.png' }],
    },
    profile,
  );

  assert.equal(result.ok, true);
  assert.equal(result.normalizedMode, 'image-to-video');
});

test('Kling family profile rejects unsupported duration, resolution, and aspect ratio combinations', () => {
  const profile = buildKlingVideoFamilyProfile();
  const result = validateKlingVideoRequest(
    {
      model: 'openrouter/kling-v1',
      prompt: 'Animate this still frame',
      durationSeconds: 7,
      aspectRatio: '4:3',
      resolution: '4k',
      referenceImages: [{ type: 'image_url', url: 'https://example.com/shot.png' }],
    },
    profile,
  );

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === 'duration_not_supported'));
  assert.ok(result.issues.some((issue) => issue.code === 'aspect_ratio_not_supported'));
  assert.ok(result.issues.some((issue) => issue.code === 'resolution_not_supported'));
});

test('Kling family profile enforces provider passthrough allow lists when present', () => {
  const model = attachKlingVideoFamilyToModel(
    {
      id: 'openrouter/kling-v1',
      displayName: 'Kling v1',
      capabilities: {},
    },
    {
      providerId: 'openrouter',
      durations: [5],
      aspectRatios: ['16:9'],
      resolutions: ['720p'],
      frameTypes: ['first_frame'],
      generateAudio: true,
      allowedPassthroughParameters: ['seed'],
    },
  );

  const result = validateKlingVideoRequest(
    {
      model: 'openrouter/kling-v1',
      prompt: 'Animate this still frame',
      durationSeconds: 5,
      aspectRatio: '16:9',
      resolution: '720p',
      providerOptions: {
        seed: 1234,
        unsupportedKnob: true,
      },
    },
    model.family,
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some(
      (issue) =>
        issue.code === 'provider_passthrough_not_allowed' &&
        issue.field === 'providerOptions.unsupportedKnob',
    ),
  );
});

test('Kling family profile can project transport-specific image-only semantics for NanoGPT models', () => {
  const model = attachKlingVideoFamilyToModel(
    {
      id: 'kling-v21-standard',
      displayName: 'Kling v2.1 Standard',
      capabilities: {},
    },
    {
      providerId: 'nanogpt',
      durations: [5, 10],
      aspectRatios: ['16:9'],
      resolutions: ['720p', '1080p'],
      frameTypes: [],
      generationModes: ['image-to-video'],
      supportsFrameImages: false,
      maxReferenceImages: 1,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale'],
    },
  );

  assert.deepEqual(model.family?.video?.generationModes, ['image-to-video']);
  assert.deepEqual(
    model.family?.video?.frameImageSupport?.supportedFrameTypes,
    [],
  );

  const result = validateKlingVideoRequest(
    {
      providerId: 'nanogpt',
      model: 'kling-v21-standard',
      prompt: 'Animate the portrait',
      durationSeconds: 5,
      aspectRatio: '16:9',
      resolution: '720p',
      frameImages: [
        {
          frameType: 'first_frame',
          image: { type: 'image_url', url: 'https://example.com/frame.png' },
        },
      ],
    },
    model.family,
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.issues.some((issue) => issue.code === 'frame_images_not_supported'),
  );
});

test('Kling family validation does not infer image-to-video naively when only multi-image mode is routable', () => {
  const model = attachKlingVideoFamilyToModel(
    {
      id: 'kling-reference-only',
      displayName: 'Kling Reference Only',
      capabilities: {},
    },
    {
      providerId: 'nanogpt',
      durations: [5],
      aspectRatios: ['16:9'],
      resolutions: ['720p'],
      frameTypes: [],
      generationModes: ['multi-image-to-video'],
      supportsFrameImages: false,
      maxReferenceImages: 4,
      allowedPassthroughParameters: ['negative_prompt'],
    },
  );

  const result = validateKlingVideoRequest(
    {
      providerId: 'nanogpt',
      model: 'kling-reference-only',
      prompt: 'Animate these references',
      durationSeconds: 5,
      aspectRatio: '16:9',
      resolution: '720p',
      referenceImages: [{ type: 'image_url', url: 'https://example.com/frame.png' }],
    },
    model.family,
  );

  assert.equal(result.ok, false);
  assert.equal(result.normalizedMode, 'multi-image-to-video');
  assert.ok(
    result.issues.some(
      (issue) => issue.code === 'reference_images_below_minimum',
    ),
  );
});
