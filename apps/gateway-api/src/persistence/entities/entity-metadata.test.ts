import assert from 'node:assert/strict';
import test from 'node:test';

import { ImageAssetEntity } from './image-asset.entity';
import { ImageJobEntity } from './image-job.entity';
import { ImageJobResultEntity } from './image-job-result.entity';
import { ProviderEntity } from './provider.entity';
import { UserProviderCredentialEntity } from './user-provider-credential.entity';
import { UserEntity } from './user.entity';

test('gateway persistence entities can be instantiated with expected fields', () => {
  const provider = new ProviderEntity();
  provider.id = 'provider-row-id';
  provider.providerId = 'nanogpt';
  provider.displayName = 'NanoGPT';
  provider.status = 'active';

  const user = new UserEntity();
  user.id = 'user-row-id';
  user.userUuid = 'public-user-uuid';
  user.emailHash = 'email-hash';
  user.status = 'active';

  const credential = new UserProviderCredentialEntity();
  credential.id = 'credential-row-id';
  credential.userId = user.id;
  credential.providerId = provider.id;
  credential.label = 'primary';
  credential.encryptedSecret = 'ciphertext';
  credential.iv = 'base64-iv';
  credential.authTag = 'base64-tag';
  credential.keyVersion = 1;
  credential.isActive = true;
  credential.maskedHint = '***1234';

  const asset = new ImageAssetEntity();
  asset.id = 'asset-row-id';
  asset.userId = user.id;
  asset.sourceType = 'generated';
  asset.label = 'Moonlit forest';
  asset.mimeType = 'image/png';
  asset.dataUrl = 'data:image/png;base64,abc123';
  asset.contentHash = 'hash-123';
  asset.originalUrl = null;
  asset.isSaved = true;

  const job = new ImageJobEntity();
  job.id = 'job-row-id';
  job.userId = user.id;
  job.requestId = 'request-1';
  job.providerId = 'xai';
  job.model = 'grok-imagine-image';
  job.prompt = 'A moonlit forest';
  job.mode = 'generation';
  job.startedAt = new Date('2026-04-27T12:00:00.000Z');
  job.completedAt = new Date('2026-04-27T12:00:12.000Z');

  const jobResult = new ImageJobResultEntity();
  jobResult.id = 'job-result-row-id';
  jobResult.jobId = job.id;
  jobResult.assetId = asset.id;
  jobResult.resultIndex = 0;
  jobResult.revisedPrompt = 'A moonlit forest in watercolor';

  assert.equal(provider.providerId, 'nanogpt');
  assert.equal(user.userUuid, 'public-user-uuid');
  assert.equal(credential.providerId, provider.id);
  assert.equal(credential.userId, user.id);
  assert.equal(credential.maskedHint, '***1234');
  assert.equal(asset.userId, user.id);
  assert.equal(job.userId, user.id);
  assert.equal(job.startedAt?.toISOString(), '2026-04-27T12:00:00.000Z');
  assert.equal(jobResult.assetId, asset.id);
});
