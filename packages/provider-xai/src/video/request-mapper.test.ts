import assert from 'node:assert/strict';
import test from 'node:test';

import { buildXAiVideoGenerationRequest } from './request-mapper.js';

test('buildXAiVideoGenerationRequest maps image-to-video requests to image payloads', async () => {
  const mapped = await buildXAiVideoGenerationRequest({
    model: 'grok-imagine-video',
    prompt: 'Animate the portrait with subtle motion',
    durationSeconds: 5,
    resolution: '480p',
    referenceImages: [
      {
        type: 'image_url',
        url: 'https://example.com/reference.png',
      },
    ],
  });

  assert.deepEqual(mapped, {
    endpoint: '/videos/generations',
    body: {
      model: 'grok-imagine-video',
      prompt: 'Animate the portrait with subtle motion',
      image: {
        url: 'https://example.com/reference.png',
      },
      duration: 5,
      resolution: '480p',
    },
  });
});

test('buildXAiVideoGenerationRequest maps reference-to-video requests to reference_images payloads', async () => {
  const mapped = await buildXAiVideoGenerationRequest({
    model: 'grok-imagine-video',
    prompt: 'Blend these references into a cinematic video',
    referenceImages: [
      {
        type: 'image_url',
        url: 'https://example.com/reference-1.png',
      },
      {
        type: 'image_url',
        url: 'https://example.com/reference-2.png',
      },
    ],
  });

  assert.deepEqual(mapped, {
    endpoint: '/videos/generations',
    body: {
      model: 'grok-imagine-video',
      prompt: 'Blend these references into a cinematic video',
      reference_images: [
        { url: 'https://example.com/reference-1.png' },
        { url: 'https://example.com/reference-2.png' },
      ],
    },
  });
});

test('buildXAiVideoGenerationRequest maps extend-video provider options to the extensions endpoint', async () => {
  const mapped = await buildXAiVideoGenerationRequest({
    model: 'grok-imagine-video',
    prompt: 'Extend the clip with a gentle outro',
    durationSeconds: 8,
    providerOptions: {
      xai: {
        mode: 'extend-video',
        videoUrl: 'https://example.com/input.mp4',
      },
    },
  });

  assert.deepEqual(mapped, {
    endpoint: '/videos/extensions',
    body: {
      model: 'grok-imagine-video',
      prompt: 'Extend the clip with a gentle outro',
      duration: 8,
      video: {
        url: 'https://example.com/input.mp4',
      },
    },
  });
});
