import assert from 'node:assert/strict';
import test from 'node:test';

import { RegistrationVerificationService } from './registration-verification.service';

type StoredChallenge = {
  id: string;
  tenantId: string;
  channel: 'email';
  destinationHash: string;
  codeDigest: string;
  purpose: 'registration';
  expiresAt: Date;
  verifiedAt: Date | null;
  consumedAt: Date | null;
  invalidatedAt: Date | null;
  attemptCount: number;
  resendCount: number;
  resendAvailableAt: Date;
  completionTokenDigest: string | null;
  completionTokenExpiresAt: Date | null;
};

function createService(options?: {
  deliveryReady?: boolean;
  deliveryFails?: boolean;
  registrationEnabled?: boolean;
  tenantResolved?: boolean;
}) {
  const stored: StoredChallenge[] = [];
  let transactionQueue = Promise.resolve();
  let deliveredCode = '';
  const deliveredInputs: Array<Record<string, unknown>> = [];
  let lockCount = 0;
  const protectedEmails: string[] = [];
  const manager = {
    createQueryBuilder: () => ({
      setLock: () => {
        lockCount += 1;
        return {
          where: (_query: string, parameters: { challengeId: string }) => ({
            getOne: async () =>
              stored.find((item) => item.id === parameters.challengeId) ?? null,
          }),
        };
      },
    }),
    save: async (value: StoredChallenge) => {
      const index = stored.findIndex((item) => item.id === value.id);
      if (index >= 0) stored[index] = value;
      return value;
    },
  };
  const repository = {
    create: (
      value: Omit<StoredChallenge, 'id' | 'attemptCount' | 'resendCount'>,
    ) => ({
      id: `challenge-${stored.length + 1}`,
      attemptCount: 0,
      resendCount: 0,
      ...value,
    }),
    save: async (value: StoredChallenge) => {
      const index = stored.findIndex((item) => item.id === value.id);
      if (index >= 0) stored[index] = value;
      else stored.push(value);
      return value;
    },
    remove: async (value: StoredChallenge) => {
      const index = stored.indexOf(value);
      if (index >= 0) stored.splice(index, 1);
    },
    findOneBy: async (where: StoredChallenge) =>
      stored.find((item) =>
        Object.entries(where).every(([key, value]) => item[key] === value),
      ) ?? null,
    manager: {
      transaction: <T>(operation: (value: typeof manager) => Promise<T>) => {
        const result = transactionQueue.then(() => operation(manager));
        transactionQueue = result.then(
          () => undefined,
          () => undefined,
        );
        return result;
      },
    },
  };
  const delivery = {
    isReady: () => options?.deliveryReady ?? true,
    sendChallenge: async (
      input: { code: string } & Record<string, unknown>,
    ) => {
      if (options?.deliveryFails) throw new Error('delivery failed');
      deliveredCode = input.code;
      deliveredInputs.push(input);
    },
  };
  const limiterCalls: string[] = [];
  const limiter = {
    assertLimit: async (scope: string) => {
      limiterCalls.push(scope);
    },
  };
  const registration = {
    resolvePublicContext: async () => ({
      registrationEnabled: options?.registrationEnabled ?? true,
      tenant:
        options?.tenantResolved === false
          ? null
          : { slug: 'lxp', displayName: 'LXP' },
    }),
  };
  const emailProtection = {
    protect: (email: string) => {
      protectedEmails.push(email.trim().toLowerCase());
      return { emailHash: 'protected-email-hash' };
    },
  };
  const tenants = {
    findOneBy: async () => ({
      id: 'tenant-1',
      slug: 'lxp',
      displayName: 'LXP',
      status: 'active',
    }),
  };
  const service = new RegistrationVerificationService(
    repository as never,
    tenants as never,
    registration as never,
    emailProtection as never,
    delivery as never,
    limiter as never,
  );
  let generatedCode = 111110;
  (service as unknown as { generateCode: () => string }).generateCode = () =>
    String((generatedCode += 1)).padStart(6, '0');
  return {
    service,
    stored,
    limiterCalls,
    getDeliveredCode: () => deliveredCode,
    getLockCount: () => lockCount,
    protectedEmails,
    deliveredInputs,
  };
}

test.beforeEach(() => {
  process.env.LXP_EMAIL_LOOKUP_KEY = Buffer.alloc(32, 7).toString('base64');
});

test('persists only digests and consumes a completion token once under concurrency', async () => {
  const { service, stored, getDeliveredCode, getLockCount, protectedEmails } =
    createService();
  const challenge = await service.create(
    null,
    ' Person@Example.com ',
    '127.0.0.1',
  );
  assert.deepEqual(protectedEmails, ['person@example.com']);
  assert.equal(stored[0].destinationHash, 'protected-email-hash');
  assert.notEqual(stored[0].codeDigest, getDeliveredCode());
  assert.equal(JSON.stringify(stored).includes('person@example.com'), false);
  assert.equal(JSON.stringify(stored).includes(getDeliveredCode()), false);

  const verified = await service.verify(
    challenge.challengeId,
    getDeliveredCode(),
    '127.0.0.1',
  );
  assert.equal(typeof verified.completionToken, 'string');
  assert.equal(
    JSON.stringify(stored).includes(verified.completionToken),
    false,
  );

  const results = await Promise.all([
    service.consumeCompletionToken(
      challenge.challengeId,
      verified.completionToken,
    ),
    service.consumeCompletionToken(
      challenge.challengeId,
      verified.completionToken,
    ),
  ]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.ok(getLockCount() >= 3);
});

test('persists incorrect attempts and enforces the maximum', async () => {
  const { service, stored } = createService();
  const challenge = await service.create(null, 'person@example.com', 'ip');

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await assert.rejects(() =>
      service.verify(challenge.challengeId, '999999', 'ip'),
    );
    assert.equal(stored[0].attemptCount, attempt);
  }
  await assert.rejects(() =>
    service.verify(challenge.challengeId, '999999', 'ip'),
  );
  assert.equal(stored[0].attemptCount, 5);
});

test('rejects expired, already verified, and unavailable challenges generically', async () => {
  const unavailableCases = [
    createService({ registrationEnabled: false }),
    createService({ tenantResolved: false }),
    createService({ deliveryReady: false }),
  ];
  for (const { service } of unavailableCases) {
    await assert.rejects(
      () => service.create(null, 'person@example.com', 'ip'),
      /Email verification is unavailable/,
    );
  }

  const { service, stored, getDeliveredCode } = createService();
  const challenge = await service.create(null, 'person@example.com', 'ip');
  stored[0].expiresAt = new Date(Date.now() - 1);
  await assert.rejects(
    () => service.verify(challenge.challengeId, getDeliveredCode(), 'ip'),
    /invalid or expired/,
  );

  const verifiedCase = createService();
  const verifiedChallenge = await verifiedCase.service.create(
    null,
    'person@example.com',
    'ip',
  );
  await verifiedCase.service.verify(
    verifiedChallenge.challengeId,
    verifiedCase.getDeliveredCode(),
    'ip',
  );
  await assert.rejects(
    () =>
      verifiedCase.service.verify(
        verifiedChallenge.challengeId,
        verifiedCase.getDeliveredCode(),
        'ip',
      ),
    /invalid or expired/,
  );
});

test('resend rotates the code without extending expiry and enforces cooldown and limits', async () => {
  const { service, stored, getDeliveredCode } = createService();
  const challenge = await service.create(null, 'person@example.com', 'ip');
  const originalCode = getDeliveredCode();
  const originalExpiry = stored[0].expiresAt;

  await assert.rejects(() =>
    service.resend(null, challenge.challengeId, 'person@example.com', 'ip'),
  );
  stored[0].resendAvailableAt = new Date(Date.now() - 1);
  await service.resend(null, challenge.challengeId, 'person@example.com', 'ip');
  assert.notEqual(getDeliveredCode(), originalCode);
  assert.equal(stored[0].expiresAt, originalExpiry);
  await assert.rejects(() =>
    service.verify(challenge.challengeId, originalCode, 'ip'),
  );
  stored[0].resendCount = 3;
  stored[0].resendAvailableAt = new Date(Date.now() - 1);
  await assert.rejects(() =>
    service.resend(null, challenge.challengeId, 'person@example.com', 'ip'),
  );
});

test('restores the prior challenge state when resend delivery fails', async () => {
  const { service, stored } = createService();
  const challenge = await service.create(null, 'person@example.com', 'ip');
  const previous = {
    codeDigest: stored[0].codeDigest,
    resendCount: stored[0].resendCount,
    resendAvailableAt: new Date(Date.now() - 1),
  };
  stored[0].resendAvailableAt = previous.resendAvailableAt;

  const failing = createService({ deliveryFails: true });
  failing.stored.push(stored[0]);
  await assert.rejects(() =>
    failing.service.resend(
      null,
      challenge.challengeId,
      'person@example.com',
      'ip',
    ),
  );
  assert.equal(failing.stored[0].codeDigest, previous.codeDigest);
  assert.equal(failing.stored[0].resendCount, previous.resendCount);
  assert.equal(failing.stored[0].resendAvailableAt, previous.resendAvailableAt);
});

test('removes a new challenge when initial delivery fails', async () => {
  const { service, stored } = createService({ deliveryFails: true });
  await assert.rejects(
    () => service.create(null, 'person@example.com', 'ip'),
    /temporarily unavailable/,
  );
  assert.equal(stored.length, 0);
});

test('admin test delivery uses only the configured recipient and is bounded', async () => {
  process.env.LXP_REGISTRATION_EMAIL_TEST_RECIPIENT = 'operator@example.com';
  const { service, deliveredInputs, limiterCalls } = createService();
  assert.deepEqual(await service.sendConfiguredTest('tenant-1'), {
    accepted: true,
  });
  assert.equal(deliveredInputs[0].destination, 'operator@example.com');
  assert.equal(deliveredInputs[0].code, '000000');
  assert.ok(limiterCalls.includes('admin-test'));
});

test('applies request, tenant, destination, resend, verify, and challenge limits', async () => {
  const { service, stored, limiterCalls } = createService();
  const challenge = await service.create(null, 'person@example.com', 'ip');
  stored[0].resendAvailableAt = new Date(Date.now() - 1);
  await service.resend(null, challenge.challengeId, 'person@example.com', 'ip');
  await assert.rejects(() =>
    service.verify(challenge.challengeId, '999999', 'ip'),
  );

  assert.deepEqual(
    new Set(limiterCalls),
    new Set([
      'request:ip',
      'request:tenant',
      'request:destination',
      'resend:ip',
      'resend:tenant',
      'resend:destination',
      'resend:challenge',
      'verify:ip',
      'verify:challenge',
    ]),
  );
});
