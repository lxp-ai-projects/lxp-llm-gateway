import assert from 'node:assert/strict';
import test from 'node:test';

import { RegistrationVerificationRateLimitService } from './registration-verification-rate-limit.service';

test('registration rate limiting sets a TTL and rejects requests over the limit', async () => {
  const calls: Array<{
    script: string;
    keys: string[];
    arguments: string[];
  }> = [];
  let count = 0;
  let ttl: number | null = null;
  const service = new RegistrationVerificationRateLimitService();
  (service as unknown as { client: unknown }).client = {
    eval: async (
      script: string,
      options: { keys: string[]; arguments: string[] },
    ) => {
      calls.push({ script, ...options });
      count += 1;
      if (count === 1) ttl = Number(options.arguments[0]);
      return count;
    },
  };

  await service.assertLimit('verify:challenge', 'challenge-1', 2, 60);
  await service.assertLimit('verify:challenge', 'challenge-1', 2, 60);
  await assert.rejects(
    () => service.assertLimit('verify:challenge', 'challenge-1', 2, 60),
    /Please try again later/,
  );
  assert.equal(calls.length, 3);
  assert.equal(ttl, 60);
  assert.ok(calls.every((call) => call.script.includes("redis.call('INCR'")));
  assert.ok(calls.every((call) => call.script.includes("redis.call('EXPIRE'")));
  assert.ok(
    calls.every(
      (call) =>
        call.keys[0] ===
          'registration-verification:verify:challenge:challenge-1' &&
        call.arguments[0] === '60',
    ),
  );
});
