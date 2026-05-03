import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
} from '@lxp/provider-sdk';

import { MistralProviderAdapter } from './index';

test('MistralProviderAdapter lists models from the Mistral models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
      data: [
        { id: 'mistral-large-latest' },
        { id: 'codestral-latest', name: 'Codestral Latest' },
      ],
    });
  }) as typeof fetch;

  try {
    const adapter = new MistralProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: { apiKey: 'mistral-token' },
    });

    assert.equal(calls[0]?.url, 'https://api.mistral.ai/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer mistral-token',
    );
    assertProviderModelIds(models, [
      'mistral-large-latest',
      'codestral-latest',
    ]);
    assert.equal(models[0]?.displayName, 'mistral-large-latest');
    assert.equal(models[1]?.displayName, 'Codestral Latest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MistralProviderAdapter sends chat requests to the Mistral chat completions endpoint', async () => {
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
            content: 'hello from mistral',
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
    const adapter = new MistralProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'mistral-large-latest',
        maxOutputTokens: 256,
        messages: [{ role: 'user', content: 'hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'mistral-token' },
      },
    );

    assert.equal(calls[0]?.url, 'https://api.mistral.ai/v1/chat/completions');
    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      max_tokens?: number;
    };
    assert.equal(body.max_tokens, 256);
    assertBasicChatResponseContract({
      response,
      providerId: 'mistral',
      model: 'mistral-large-latest',
      content: 'hello from mistral',
      finishReason: 'stop',
      promptTokens: 10,
      completionTokens: 12,
      totalTokens: 22,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MistralProviderAdapter surfaces HTTP error messages cleanly', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse(
      {
        message: 'Model not found.',
      },
      404,
    )) as typeof fetch;

  try {
    const adapter = new MistralProviderAdapter();
    await assert.rejects(
      () =>
        adapter.chat(
          {
            model: 'missing-model',
            messages: [{ role: 'user', content: 'hello' }],
          },
          {
            requestId: 'request-1',
            userId: 'user-1',
            providerAccess: { apiKey: 'mistral-token' },
          },
        ),
      /Mistral request failed with status 404: Model not found\./,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('MistralProviderAdapter returns the upstream stream body', async () => {
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
    const adapter = new MistralProviderAdapter();
    const stream = await adapter.chatStream(
      {
        model: 'mistral-large-latest',
        messages: [{ role: 'user', content: 'hello' }],
        stream: true,
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: { apiKey: 'mistral-token' },
      },
    );

    const reader = stream.getReader();
    const firstChunk = await reader.read();
    assert.match(new TextDecoder().decode(firstChunk.value), /"content":"hello"/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
