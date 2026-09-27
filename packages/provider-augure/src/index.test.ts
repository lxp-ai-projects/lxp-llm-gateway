import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
  readStreamAsText,
} from '@lxp/provider-sdk';

import { AugureProviderAdapter } from './index.js';

const context = {
  requestId: 'request-1',
  userId: 'internal-user-1',
  providerAccess: { apiKey: 'augure-test-token' },
};

test('discovers native models and hides only documented compatibility aliases', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      data: [
        { id: 'auto', capabilities: { reasoning: true } },
        { id: 'ossington-5', name: 'Ossington 5' },
        { id: 'rosedale-1' },
        { id: 'future-native-model', capabilities: { reasoning: true } },
        { id: 'gpt-4' },
        { id: 'gpt-4o' },
        { id: 'gpt-4o-mini' },
        { id: 'gpt-3.5-turbo' },
      ],
    });
  }) as typeof fetch;

  try {
    const adapter = new AugureProviderAdapter();
    const models = await adapter.listModels(context);
    assert.equal(adapter.providerId, 'augure');
    assert.equal(adapter.supportsStreaming(), true);
    assert.equal(adapter.capabilities.chat, true);
    assert.equal(calls[0]?.url, 'https://api.augureai.ca/v1/models');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer augure-test-token',
    );
    assertProviderModelIds(models, [
      'auto',
      'ossington-5',
      'rosedale-1',
      'future-native-model',
    ]);
    assert.equal(models[1]?.displayName, 'Ossington 5');
    assert.equal(models[0]?.capabilities?.reasoning, undefined);
    assert.equal(models[3]?.capabilities?.reasoning?.supported, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('sends a minimal chat body without the internal user identifier', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 123,
      choices: [
        {
          finish_reason: 'stop',
          message: { role: 'assistant', content: 'Bonjour' },
        },
      ],
      usage: { prompt_tokens: 4, completion_tokens: 8, total_tokens: 12 },
    });
  }) as typeof fetch;

  try {
    const adapter = new AugureProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'ossington-5',
        maxOutputTokens: 120,
        messages: [{ role: 'user', content: 'Bonjour' }],
      },
      context,
    );
    assert.equal(calls[0]?.url, 'https://api.augureai.ca/v1/chat/completions');
    assert.equal(
      (calls[0]?.init?.headers as Record<string, string>).authorization,
      'Bearer augure-test-token',
    );
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'ossington-5',
      messages: [{ role: 'user', content: 'Bonjour' }],
      stream: false,
      max_tokens: 120,
    });
    assertBasicChatResponseContract({
      response,
      providerId: 'augure',
      model: 'ossington-5',
      content: 'Bonjour',
      finishReason: 'stop',
      promptTokens: 4,
      completionTokens: 8,
      totalTokens: 12,
    });
    assert.deepEqual(response.providerMetadata, {
      id: 'chatcmpl-1',
      object: 'chat.completion',
      created: 123,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('preserves only documented Augure metadata and generic metadata', async () => {
  const originalFetch = globalThis.fetch;
  const metadataCases = [
    {
      input: {
        gateway_region: 'ca-montreal-1',
        inference_region: 'augure-cloud',
        request_id: 'upstream-1',
        private_data: 'discard',
      },
      expected: {
        gateway_region: 'ca-montreal-1',
        inference_region: 'augure-cloud',
        request_id: 'upstream-1',
      },
    },
    {
      input: { gateway_region: 'ca-montreal-1' },
      expected: { gateway_region: 'ca-montreal-1' },
    },
    {
      input: { gateway_region: 123, inference_region: null, request_id: {} },
      expected: undefined,
    },
    { input: null, expected: undefined },
  ];

  try {
    const adapter = new AugureProviderAdapter();
    for (const metadataCase of metadataCases) {
      globalThis.fetch = (async () =>
        createJsonResponse({
          id: 'chatcmpl-1',
          x_trace: 'trace-1',
          choices: [{ message: { role: 'assistant', content: 'ok' } }],
          _augure: metadataCase.input,
          arbitrary: 'discard',
        })) as typeof fetch;
      const response = await adapter.chat(
        { model: 'tofino-3', messages: [{ role: 'user', content: 'hello' }] },
        context,
      );
      assert.deepEqual(response.providerMetadata, {
        id: 'chatcmpl-1',
        x_trace: 'trace-1',
        ...(metadataCase.expected ? { _augure: metadataCase.expected } : {}),
      });
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('returns undefined metadata when no allowed fields are present', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
      _augure: { request_id: false },
    })) as typeof fetch;
  try {
    const response = await new AugureProviderAdapter().chat(
      { model: 'tofino-3', messages: [{ role: 'user', content: 'hello' }] },
      context,
    );
    assert.equal(response.providerMetadata, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('passes through SSE deltas and the DONE marker without adding user', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const wire = 'data: {"choices":[{"delta":{"content":"hi"}}]}\n\ndata: [DONE]\n\n';
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(wire, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });
  }) as typeof fetch;

  try {
    const stream = await new AugureProviderAdapter().chatStream(
      { model: 'tofino-3', messages: [{ role: 'user', content: 'hi' }] },
      context,
    );
    assert.equal(await readStreamAsText(stream), wire);
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      model: 'tofino-3',
      messages: [{ role: 'user', content: 'hi' }],
      stream: true,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('surfaces OpenAI-format errors', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse({ error: { message: 'Invalid API key provided' } }, 401)) as typeof fetch;
  try {
    await assert.rejects(
      () =>
        new AugureProviderAdapter().chat(
          { model: 'tofino-3', messages: [{ role: 'user', content: 'hi' }] },
          context,
        ),
      /Augure request failed with status 401: Invalid API key provided/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('honors timeout and falls back for invalid timeout configuration', async () => {
  const originalFetch = globalThis.fetch;
  const originalSetTimeout = globalThis.setTimeout;
  const originalTimeout = process.env.AUGURE_REQUEST_TIMEOUT_MS;
  globalThis.fetch = (async (_url: string | URL, init?: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    })) as typeof fetch;
  try {
    await assert.rejects(
      () => new AugureProviderAdapter(undefined, 5).listModels(context),
      /Augure request timed out after 5 ms/,
    );
    process.env.AUGURE_REQUEST_TIMEOUT_MS = 'invalid';
    let scheduledTimeoutMs: number | undefined;
    globalThis.setTimeout = ((callback: () => void, delay?: number) => {
      scheduledTimeoutMs = delay;
      queueMicrotask(callback);
      return originalSetTimeout(() => {}, 0);
    }) as typeof setTimeout;
    const adapter = new AugureProviderAdapter();
    await assert.rejects(
      () => adapter.listModels(context),
      /Augure request timed out after 90000 ms/,
    );
    assert.equal(scheduledTimeoutMs, 90000);
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.setTimeout = originalSetTimeout;
    if (originalTimeout === undefined) {
      delete process.env.AUGURE_REQUEST_TIMEOUT_MS;
    } else {
      process.env.AUGURE_REQUEST_TIMEOUT_MS = originalTimeout;
    }
  }
});

test('supports a custom base URL override', async () => {
  const originalFetch = globalThis.fetch;
  let requestUrl = '';
  globalThis.fetch = (async (url: string | URL) => {
    requestUrl = String(url);
    return createJsonResponse({ data: [] });
  }) as typeof fetch;
  try {
    await new AugureProviderAdapter().listModels({
      ...context,
      providerAccess: {
        apiKey: 'augure-test-token',
        baseUrl: 'https://custom.example/v1/',
      },
    });
    assert.equal(requestUrl, 'https://custom.example/v1/models');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
