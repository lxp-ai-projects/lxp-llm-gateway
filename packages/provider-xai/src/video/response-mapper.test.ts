import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapXAiAcceptedVideoJob,
  mapXAiVideoJob,
  mapXAiVideoStatus,
} from './response-mapper.js';

const context = {
  requestId: 'req-video-1',
  userId: 'user-1',
  providerAccess: {
    apiKey: 'xai-token',
  },
};

test('mapXAiAcceptedVideoJob normalizes accepted xAI video requests', () => {
  const job = mapXAiAcceptedVideoJob('grok-imagine-video', context, {
    request_id: 'video-request-123',
  });

  assert.equal(job.id, 'video-request-123');
  assert.equal(job.status, 'queued');
  assert.equal(job.providerMetadata?.requestId, 'video-request-123');
});

test('mapXAiVideoJob normalizes completed xAI video jobs', () => {
  const job = mapXAiVideoJob('grok-imagine-video', context, {
    request_id: 'video-request-123',
    status: 'done',
    model: 'grok-imagine-video',
    video: {
      url: 'https://videos.x.ai/output.mp4',
      duration: 9,
      respect_moderation: true,
    },
  });

  assert.equal(job.status, 'succeeded');
  assert.equal(job.outputs[0]?.contentUrl, 'https://videos.x.ai/output.mp4');
  assert.equal(job.outputs[0]?.durationSeconds, 9);
});

test('mapXAiVideoStatus maps xAI states conservatively', () => {
  assert.equal(mapXAiVideoStatus('pending'), 'running');
  assert.equal(mapXAiVideoStatus('done'), 'succeeded');
  assert.equal(mapXAiVideoStatus('failed'), 'failed');
  assert.equal(mapXAiVideoStatus('expired'), 'failed');
  assert.equal(mapXAiVideoStatus('unknown'), 'queued');
});
