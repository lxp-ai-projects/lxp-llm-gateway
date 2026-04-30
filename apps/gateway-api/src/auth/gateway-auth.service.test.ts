import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';

import { GatewayAuthService } from './gateway-auth.service';

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => Promise<void>,
) {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previousValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return run().finally(() => {
    for (const [key, value] of previousValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

function computeEmailHash(email: string, lookupKey: Buffer) {
  return createHmac('sha256', lookupKey)
    .update(email.trim().toLowerCase())
    .digest('hex');
}

test('GatewayAuthService resolves a trusted Open WebUI user from the forwarded email header', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const bobHash = computeEmailHash('bob@example.com', lookupKey);
  const users = [
    {
      id: 'user-1',
      userUuid: 'uuid-1',
      emailHash: aliceHash,
      status: 'active',
      defaultProviderId: 'nanogpt',
      defaultModel: 'nano-1',
      defaultImageProviderId: null,
      defaultImageModel: null,
    },
    {
      id: 'user-2',
      userUuid: 'uuid-2',
      emailHash: bobHash,
      status: 'active',
      defaultProviderId: 'openrouter',
      defaultModel: 'meta-llama/llama-3.3-70b-instruct',
      defaultImageProviderId: null,
      defaultImageModel: null,
    },
  ];
  const service = new GatewayAuthService(
    {
      verifyAsync: async () => {
        throw new Error('jwt not used');
      },
    } as never,
    {
      findOne: async ({ where }: { where: { emailHash: string; status: string } }) =>
        users.find(
          (user) =>
            user.emailHash === where.emailHash && user.status === where.status,
        ) ?? null,
    } as never,
  );

  await withEnv(
    {
      LXP_OPENAI_COMPAT_API_KEY: 'open-webui-shared-key',
      LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED: 'true',
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
      LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL: 'alice@example.com',
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
    },
    async () => {
      const authContext = await service.authenticateOpenAiCompatibleRequest(
        'Bearer open-webui-shared-key',
        undefined,
        {
          'x-openwebui-user-email': 'bob@example.com',
        },
      );

      assert.equal(authContext.userId, 'user-2');
      assert.equal(
        authContext.identitySource,
        'openai-compatible-trusted-header',
      );
      assert.equal(authContext.defaultProviderId, 'openrouter');
      assert.equal(
        authContext.defaultModel,
        'meta-llama/llama-3.3-70b-instruct',
      );
    },
  );
});

test('GatewayAuthService rejects a forwarded Open WebUI user header when trusted identity mode is disabled', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const service = new GatewayAuthService(
    {
      verifyAsync: async () => {
        throw new Error('jwt not used');
      },
    } as never,
    {
      findOne: async ({ where }: { where: { emailHash: string; status: string } }) =>
        where.emailHash === aliceHash && where.status === 'active'
          ? {
              id: 'user-1',
              userUuid: 'uuid-1',
              emailHash: aliceHash,
              status: 'active',
              defaultProviderId: 'nanogpt',
              defaultModel: 'nano-1',
              defaultImageProviderId: null,
              defaultImageModel: null,
            }
          : null,
    } as never,
  );

  await withEnv(
    {
      LXP_OPENAI_COMPAT_API_KEY: 'open-webui-shared-key',
      LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED: 'false',
      LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER: 'X-OpenWebUI-User-Email',
      LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL: 'alice@example.com',
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
    },
    async () => {
      await assert.rejects(
        () =>
          service.authenticateOpenAiCompatibleRequest(
            'Bearer open-webui-shared-key',
            undefined,
            {
              'x-openwebui-user-email': 'bob@example.com',
            },
          ),
        /Trusted OpenAI-compatible identity headers are not accepted/,
      );
    },
  );
});

test('GatewayAuthService falls back to the configured default Open WebUI user email', async () => {
  const lookupKey = randomBytes(32);
  const aliceHash = computeEmailHash('alice@example.com', lookupKey);
  const service = new GatewayAuthService(
    {
      verifyAsync: async () => {
        throw new Error('jwt not used');
      },
    } as never,
    {
      findOne: async ({ where }: { where: { emailHash: string; status: string } }) =>
        where.emailHash === aliceHash && where.status === 'active'
          ? {
              id: 'user-1',
              userUuid: 'uuid-1',
              emailHash: aliceHash,
              status: 'active',
              defaultProviderId: 'nanogpt',
              defaultModel: 'nano-1',
              defaultImageProviderId: null,
              defaultImageModel: null,
            }
          : null,
    } as never,
  );

  await withEnv(
    {
      LXP_OPENAI_COMPAT_API_KEY: 'open-webui-shared-key',
      LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED: 'false',
      LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL: 'alice@example.com',
      LXP_EMAIL_LOOKUP_KEY: lookupKey.toString('base64'),
    },
    async () => {
      const authContext = await service.authenticateOpenAiCompatibleRequest(
        'Bearer open-webui-shared-key',
      );

      assert.equal(authContext.userId, 'user-1');
      assert.equal(
        authContext.identitySource,
        'openai-compatible-default-user',
      );
      assert.equal(authContext.defaultProviderId, 'nanogpt');
    },
  );
});
