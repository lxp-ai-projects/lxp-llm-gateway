import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  createJsonResponse,
} from '@lxp/provider-sdk';

import { ZaiProviderAdapter } from './index.js';

test('ZaiProviderAdapter uses the live /models list as the source of truth', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      data: [{ id: 'glm-5.1' }],
    });
  }) as typeof fetch;

  try {
    const adapter = new ZaiProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'zai-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.z.ai/api/paas/v4/models');
    assert.deepEqual(models.map((model) => model.id), ['glm-5.1']);
    assert.ok(!models.some((model) => model.id === 'glm-image'));
    assert.equal(models[0]?.displayName, 'GLM-5.1');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ZaiProviderAdapter sends chat requests through the Z.ai chat completions endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      id: 'chatcmpl-1',
      request_id: 'provider-request-1',
      choices: [
        {
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: 'hello from zai',
            reasoning_content: 'short reasoning summary',
          },
        },
      ],
      usage: {
        prompt_tokens: 20,
        completion_tokens: 30,
        total_tokens: 50,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new ZaiProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'glm-5.1',
        maxOutputTokens: 2048,
        providerOptions: {
          zai: {
            thinking: {
              type: 'enabled',
              clearThinking: false,
            },
          },
        },
        messages: [
          { role: 'user', content: 'hello' },
          {
            role: 'assistant',
            content: 'prior answer',
            reasoningContent: 'prior reasoning',
          },
        ],
      },
      {
        requestId: 'gateway-request-1',
        userId: 'user-123456',
        providerAccess: { apiKey: 'zai-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://api.z.ai/api/paas/v4/chat/completions',
    );
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      request_id?: string;
      user_id?: string;
      max_tokens?: number;
      thinking?: {
        type?: string;
        clear_thinking?: boolean;
      };
      messages?: Array<{
        role?: string;
        content?: string;
        reasoning_content?: string;
      }>;
    };
    assert.equal(body.request_id, 'gateway-request-1');
    assert.equal(body.user_id, 'user-123456');
    assert.equal(body.max_tokens, 2048);
    assert.deepEqual(body.thinking, {
      type: 'enabled',
      clear_thinking: false,
    });
    assert.deepEqual(body.messages, [
      {
        role: 'user',
        content: 'hello',
      },
      {
        role: 'assistant',
        content: 'prior answer',
        reasoning_content: 'prior reasoning',
      },
    ]);
    assertBasicChatResponseContract({
      response,
      providerId: 'zai',
      model: 'glm-5.1',
      content: 'hello from zai',
      finishReason: 'stop',
      promptTokens: 20,
      completionTokens: 30,
      totalTokens: 50,
    });
    assert.equal(response.message.reasoning, 'short reasoning summary');
    assert.deepEqual(response.providerMetadata, {
      request_id: 'provider-request-1',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ZaiProviderAdapter exposes a static image catalog fallback when /models is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse({ message: 'Not found' }, 404)) as typeof fetch;

  try {
    const adapter = new ZaiProviderAdapter();
    const catalog = await adapter.listImageCatalog({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'zai-token' },
    });

    assert.equal(catalog.providerId, 'zai');
    assert.equal(catalog.defaultModelId, 'glm-image');
    assert.deepEqual(
      catalog.models.map((model) => model.id),
      ['glm-image', 'cogview-4-250304'],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
