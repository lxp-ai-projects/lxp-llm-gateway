import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
} from '@lxp/provider-sdk';

import { DeepSeekProviderAdapter } from './index';

test('DeepSeekProviderAdapter lists current DeepSeek V4 models and excludes deprecated aliases', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      object: 'list',
      data: [
        { id: 'deepseek-v4-flash', object: 'model', owned_by: 'deepseek' },
        { id: 'deepseek-v4-pro', object: 'model', owned_by: 'deepseek' },
        { id: 'deepseek-chat', object: 'model', owned_by: 'deepseek' },
      ],
    });
  }) as typeof fetch;

  try {
    const adapter = new DeepSeekProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'deepseek-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.deepseek.com/models');
    assertProviderModelIds(models, [
      'deepseek-v4-flash',
      'deepseek-v4-pro',
    ]);
    assert.equal(models[0]?.displayName, 'DeepSeek V4 Flash');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DeepSeekProviderAdapter sends chat requests to the DeepSeek chat completions endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      choices: [
        {
          finish_reason: 'stop',
          message: {
            role: 'assistant',
            content: 'hello from deepseek',
            reasoning: 'chain of thought summary',
          },
        },
      ],
      usage: {
        prompt_tokens: 22,
        completion_tokens: 30,
        total_tokens: 52,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new DeepSeekProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'deepseek-v4-flash',
        maxOutputTokens: 2048,
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'deepseek-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.deepseek.com/chat/completions');
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      max_tokens?: number;
    };
    assert.equal(body.max_tokens, 2048);
    assertBasicChatResponseContract({
      response,
      providerId: 'deepseek',
      model: 'deepseek-v4-flash',
      content: 'hello from deepseek',
      finishReason: 'stop',
      promptTokens: 22,
      completionTokens: 30,
      totalTokens: 52,
    });
    assert.equal(response.message.reasoning, 'chain of thought summary');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DeepSeekProviderAdapter surfaces HTTP error messages cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse(
      {
        error: {
          message: 'Authentication failed.',
        },
      },
      401,
    )) as typeof fetch;

  try {
    const adapter = new DeepSeekProviderAdapter();
    await assert.rejects(
      () =>
        adapter.chat(
          {
            model: 'deepseek-v4-pro',
            messages: [{ role: 'user', content: 'hello' }],
          },
          {
            requestId: 'request-1',
            userId: 'user-1',
            providerAccess: { apiKey: 'deepseek-token' },
          },
        ),
      /DeepSeek request failed with status 401: Authentication failed\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('DeepSeekProviderAdapter returns the upstream stream body', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode(
              'data: {"choices":[{"delta":{"content":"hello"}}]}\n\n',
            ),
          );
          controller.close();
        },
      }),
      {
        status: 200,
        headers: { 'content-type': 'text/event-stream' },
      },
    )) as typeof fetch;

  try {
    const adapter = new DeepSeekProviderAdapter();
    const stream = await adapter.chatStream(
      {
        model: 'deepseek-v4-pro',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'deepseek-token' },
      },
    );

    const reader = stream.getReader();
    const firstChunk = await reader.read();
    assert.match(new TextDecoder().decode(firstChunk.value), /"content":"hello"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
