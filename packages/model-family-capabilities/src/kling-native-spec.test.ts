import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildUnknownKlingNativeSpecDiagnostic,
  lookupKlingNativeVideoSpec,
  projectKlingVideoCapabilities,
} from './index.js';

test('lookupKlingNativeVideoSpec resolves Kling 2.6 Pro native defaults conservatively', () => {
  const spec = lookupKlingNativeVideoSpec({
    id: 'provider/kling-v26-pro',
    displayName: 'Kling 2.6 Pro',
  });

  assert.ok(spec);
  assert.equal(spec?.version, '2.6');
  assert.equal(spec?.tier, 'pro');
  assert.deepEqual(spec?.supportedModes, ['text-to-video', 'image-to-video']);
  assert.deepEqual(spec?.supportedAspectRatios, ['16:9', '9:16', '1:1']);
});

test('projectKlingVideoCapabilities intersects native, provider, and transport capabilities', () => {
  const spec = lookupKlingNativeVideoSpec({
    id: 'provider/kling-v30-pro',
    displayName: 'Kling 3.0 Pro',
  });
  const projection = projectKlingVideoCapabilities({
    nativeSpec: spec,
    providerId: 'openrouter',
    modelId: 'provider/kling-v30-pro',
    liveMetadata: {
      inferredGenerationModes: ['text-to-video', 'image-to-video'],
      durations: [5, 10],
      aspectRatios: ['16:9', '9:16', '4:3'],
      resolutions: ['720p', '1080p', '4k'],
      frameTypes: ['first_frame'],
      generateAudio: true,
      allowedPassthroughParameters: ['negative_prompt', 'cfg_scale', 'seed'],
      maxReferenceImages: 1,
    },
    transportCapabilities: {
      supportedGenerationModes: ['text-to-video', 'image-to-video'],
      supportedFrameTypes: ['first_frame'],
      supportsFrameImages: true,
      supportedPassthroughParameters: ['negative_prompt', 'seed'],
    },
    baseDiagnostics: [],
  });

  assert.deepEqual(projection.generationModes, ['text-to-video', 'image-to-video']);
  assert.deepEqual(projection.aspectRatios, ['16:9', '9:16']);
  assert.deepEqual(projection.resolutions, ['720p', '1080p']);
  assert.deepEqual(projection.frameTypes, ['first_frame']);
  assert.deepEqual(projection.allowedPassthroughParameters, ['negative_prompt']);
  assert.ok(
    projection.diagnostics.some(
      (diagnostic) => diagnostic.code === 'provider_claims_capability_unknown_to_native_spec',
    ),
  );
});

test('projectKlingVideoCapabilities records low-confidence diagnostics when native spec is unknown', () => {
  const projection = projectKlingVideoCapabilities({
    nativeSpec: null,
    providerId: 'nanogpt',
    modelId: 'kling-experimental-foo',
    liveMetadata: {
      declaredGenerationModes: ['text-to-video'],
      durations: [5],
      aspectRatios: ['16:9'],
      resolutions: ['720p'],
      generateAudio: false,
      allowedPassthroughParameters: ['negative_prompt'],
      maxReferenceImages: 0,
    },
    transportCapabilities: {
      supportedGenerationModes: ['text-to-video'],
      supportedFrameTypes: [],
      supportsFrameImages: false,
      supportedPassthroughParameters: ['negative_prompt'],
    },
    baseDiagnostics: [buildUnknownKlingNativeSpecDiagnostic()],
  });

  assert.deepEqual(projection.generationModes, ['text-to-video']);
  assert.ok(
    projection.diagnostics.some(
      (diagnostic) => diagnostic.code === 'low_confidence_inference',
    ),
  );
});
