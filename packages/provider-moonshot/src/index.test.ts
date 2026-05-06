import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
} from '@lxp/provider-sdk';

import { MoonshotProviderAdapter } from './index.js';

test('MoonshotProviderAdapter lists models from the Moonshot models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      object: 'list',
      data: [
        { id: 'kimi-k2.5', owned_by: 'moonshot' },
        { id: 'moonshot-v1-128k', owned_by: 'moonshot' },
      ],
    });
  }) as typeof fetch;

  try {
    const adapter = new MoonshotProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'moonshot-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.moonshot.ai/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer moonshot-token',
    );
    assertProviderModelIds(models, ['kimi-k2.5', 'moonshot-v1-128k']);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MoonshotProviderAdapter sends chat requests to the Moonshot chat completions endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 123,
      choices: [
        {
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: 'hello from moonshot',
          },
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 12,
        total_tokens: 22,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new MoonshotProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'kimi-k2.5',
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'moonshot-token' },
      },
    );

    assert.equal(
      calls[0]?.url,
      'https://api.moonshot.ai/v1/chat/completions',
    );
    assertBasicChatResponseContract({
      response,
      providerId: 'moonshot',
      model: 'kimi-k2.5',
      content: 'hello from moonshot',
      finishReason: 'stop',
      promptTokens: 10,
      completionTokens: 12,
      totalTokens: 22,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
