import assert from 'node:assert/strict';
import test from 'node:test';

import { RegistrationVerificationRateLimitService } from './registration-verification-rate-limit.service';

test('registration rate limiting sets a TTL and rejects requests over the limit', async () => {
  const calls: string[] = [];
  let count = 0;
  const service = new RegistrationVerificationRateLimitService();
  (service as unknown as { client: unknown }).client = {
    incr: async (key: string) => {
      calls.push(`incr:${key}`);
      count += 1;
      return count;
    },
    expire: async (key: string, ttl: number) => {
      calls.push(`expire:${key}:${ttl}`);
      return true;
    },
  };

  await service.assertLimit('verify:challenge', 'challenge-1', 2, 60);
  await service.assertLimit('verify:challenge', 'challenge-1', 2, 60);
  await assert.rejects(
    () => service.assertLimit('verify:challenge', 'challenge-1', 2, 60),
    /Please try again later/,
  );
  assert.deepEqual(calls, [
    'incr:registration-verification:verify:challenge:challenge-1',
    'expire:registration-verification:verify:challenge:challenge-1:60',
    'incr:registration-verification:verify:challenge:challenge-1',
    'incr:registration-verification:verify:challenge:challenge-1',
  ]);
});
