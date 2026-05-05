import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBasicChatResponseContract,
  assertProviderModelIds,
  createJsonResponse,
  readStreamAsText,
} from '@lxp/provider-sdk';

import { AnthropicProviderAdapter } from './index';

test('AnthropicProviderAdapter lists models from the Anthropic models endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
        data: [
          {
            id: 'claude-sonnet-4-20250514',
            display_name: 'Claude Sonnet 4',
          },
        ],
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    const models = await adapter.listModels({
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {
        apiKey: 'anthropic-token',
      },
    });

    assert.equal(calls[0]?.url, 'https://api.anthropic.com/v1/models');
    const headers = calls[0]?.init?.headers as Record<string, string>;
    assert.equal(headers['x-api-key'], 'anthropic-token');
    assert.equal(headers['anthropic-version'], '2023-06-01');
    assertProviderModelIds(models, ['claude-sonnet-4-20250514']);
    assert.equal(models[0]?.displayName, 'Claude Sonnet 4');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter maps gateway messages into the Messages API payload with default max tokens', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return createJsonResponse({
        id: 'msg_123',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-20250514',
        stop_reason: 'end_turn',
        content: [
          { type: 'text', text: 'Hello from Claude' },
        ],
        usage: {
          input_tokens: 12,
          output_tokens: 15,
        },
      });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Hello' },
        ],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      system?: string;
      messages?: Array<{ role: string; content: string }>;
      max_tokens?: number;
      stream?: boolean;
    };

    assert.equal(calls[0]?.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(body.system, 'You are helpful.');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Hello' }]);
    assert.equal(body.max_tokens, 4096);
    assert.equal(body.stream, false);
    assertBasicChatResponseContract({
      response,
      providerId: 'anthropic',
      model: 'claude-sonnet-4-20250514',
      content: 'Hello from Claude',
      finishReason: 'end_turn',
      promptTokens: 12,
      completionTokens: 15,
      totalTokens: 27,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter uses request maxOutputTokens when provided', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-opus-4-20250514',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Hello from Opus' }],
      usage: {
        input_tokens: 20,
        output_tokens: 30,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    const response = await adapter.chat(
      {
        model: 'claude-opus-4-20250514',
        maxOutputTokens: 8192,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      {
        requestId: 'request-2',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      max_tokens?: number;
    };
    assert.equal(body.max_tokens, 8192);
    assertBasicChatResponseContract({
      response,
      providerId: 'anthropic',
      model: 'claude-opus-4-20250514',
      content: 'Hello from Opus',
      finishReason: 'end_turn',
      promptTokens: 20,
      completionTokens: 30,
      totalTokens: 50,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter maps adaptive extended thinking for Anthropic requests', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: 'Plan' }, { type: 'text', text: 'Done' }],
      usage: {
        input_tokens: 20,
        output_tokens: 30,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    await adapter.chat(
      {
        model: 'claude-sonnet-4-6',
        providerOptions: {
          anthropic: {
            extendedThinking: {
              mode: 'adaptive',
            },
          },
        },
        messages: [{ role: 'user', content: 'Think hard' }],
      },
      {
        requestId: 'request-3',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      thinking?: Record<string, unknown>;
    };
    assert.deepEqual(body.thinking, {
      type: 'adaptive',
      display: 'summarized',
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter maps budgeted extended thinking and keeps max_tokens above the budget', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      stop_reason: 'end_turn',
      content: [{ type: 'thinking', thinking: 'Reasoning' }, { type: 'text', text: 'Done' }],
      usage: {
        input_tokens: 40,
        output_tokens: 60,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    await adapter.chat(
      {
        model: 'claude-opus-4-1-20250805',
        providerOptions: {
          anthropic: {
            extendedThinking: {
              mode: 'budget',
              budgetTokens: 6000,
            },
          },
        },
        messages: [{ role: 'user', content: 'Think longer' }],
      },
      {
        requestId: 'request-4',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      max_tokens?: number;
      thinking?: Record<string, unknown>;
    };
    assert.equal(body.max_tokens, 6001);
    assert.deepEqual(body.thinking, {
      type: 'enabled',
      budget_tokens: 6000,
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter preserves a higher maxOutputTokens above the thinking budget', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-opus-4-1-20250805',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'Done' }],
      usage: {
        input_tokens: 40,
        output_tokens: 60,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    await adapter.chat(
      {
        model: 'claude-opus-4-1-20250805',
        maxOutputTokens: 8000,
        providerOptions: {
          anthropic: {
            extendedThinking: {
              mode: 'budget',
              budgetTokens: 6000,
            },
          },
        },
        messages: [{ role: 'user', content: 'Think longer' }],
      },
      {
        requestId: 'request-4b',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      max_tokens?: number;
    };
    assert.equal(body.max_tokens, 8000);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter counts input tokens through the Anthropic count_tokens endpoint', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      input_tokens: 321,
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();
    const result = await adapter.countTextTokens(
      {
        model: 'claude-opus-4-1-20250805',
        providerOptions: {
          anthropic: {
            extendedThinking: {
              mode: 'adaptive',
            },
          },
        },
        messages: [
          { role: 'system', content: 'Be precise.' },
          { role: 'user', content: 'Hello' },
        ],
      },
      {
        requestId: 'request-count-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      system?: string;
      messages?: Array<{ role: string; content: string }>;
      thinking?: Record<string, unknown>;
    };
    assert.equal(calls[0]?.url, 'https://api.anthropic.com/v1/messages/count_tokens');
    assert.equal(body.system, 'Be precise.');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Hello' }]);
    assert.deepEqual(body.thinking, {
      type: 'adaptive',
      display: 'summarized',
    });
    assert.equal(result.inputTokens, 321);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter joins multiple system messages and omits empty system payloads', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 1,
        output_tokens: 1,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();

    await adapter.chat(
      {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'system', content: 'Be concise.' },
          { role: 'system', content: 'Be accurate.' },
          { role: 'user', content: 'Hello' },
        ],
      },
      {
        requestId: 'request-3',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    await adapter.chat(
      {
        model: 'claude-sonnet-4-20250514',
        messages: [{ role: 'user', content: 'Hello again' }],
      },
      {
        requestId: 'request-4',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const firstBody = JSON.parse(String(calls[0]?.init?.body)) as {
      system?: string;
    };
    const secondBody = JSON.parse(String(calls[1]?.init?.body)) as {
      system?: string;
    };

    assert.equal(firstBody.system, 'Be concise.\n\nBe accurate.');
    assert.equal(secondBody.system, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter preserves multi-turn message order for Anthropic payloads', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return createJsonResponse({
      role: 'assistant',
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text: 'ok' }],
      usage: {
        input_tokens: 10,
        output_tokens: 4,
      },
    });
  }) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();

    await adapter.chat(
      {
        model: 'claude-sonnet-4-20250514',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' },
        ],
      },
      {
        requestId: 'request-multi-turn',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const body = JSON.parse(String(calls[0]?.init?.body)) as {
      messages?: Array<{ role: string; content: string }>;
    };

    assert.deepEqual(body.messages, [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'How are you?' },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter transforms Sonnet SSE streams into gateway SSE chunks', async () => {
  const encoder = new TextEncoder();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"Plan"}}\n\n' +
                'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"Hello"}}\n\n' +
                'event: message_delta\n' +
                'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n' +
                'event: message_stop\n' +
                'data: {"type":"message_stop"}\n\n',
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
    const adapter = new AnthropicProviderAdapter();
    const stream = await adapter.chatStream(
      {
        model: 'claude-sonnet-4-20250514',
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const output = await readStreamAsText(stream);

    assert.match(output, /"reasoning":"Plan"/);
    assert.match(output, /"content":"Hello"/);
    assert.match(output, /"finish_reason":"end_turn"/);
    assert.match(output, /\[DONE\]/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter transforms Opus SSE streams into gateway SSE chunks', async () => {
  const encoder = new TextEncoder();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello from Opus"}}\n\n' +
                'event: message_delta\n' +
                'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n' +
                'event: message_stop\n' +
                'data: {"type":"message_stop"}\n\n',
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
    const adapter = new AnthropicProviderAdapter();
    const stream = await adapter.chatStream(
      {
        model: 'claude-opus-4-20250514',
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      {
        requestId: 'request-1',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const output = await readStreamAsText(stream);
    assert.match(output, /"content":"Hello from Opus"/);
    assert.match(output, /"finish_reason":"end_turn"/);
    assert.match(output, /\[DONE\]/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter reassembles fragmented SSE chunks before transforming them', async () => {
  const encoder = new TextEncoder();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","index":0,',
            ),
          );
          controller.enqueue(
            encoder.encode(
              '"delta":{"type":"thinking_delta","thinking":"Plan"}}\n\n' +
                'event: content_block_delta\n' +
                'data: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta",',
            ),
          );
          controller.enqueue(
            encoder.encode(
              '"text":"Hello"}}\n\n' +
                'event: message_delta\n' +
                'data: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n' +
                'event: message_stop\n' +
                'data: {"type":"message_stop"}\n\n',
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
    const adapter = new AnthropicProviderAdapter();
    const stream = await adapter.chatStream(
      {
        model: 'claude-sonnet-4-20250514',
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      {
        requestId: 'request-fragmented-stream',
        userId: 'user-1',
        providerAccess: {
          apiKey: 'anthropic-token',
        },
      },
    );

    const output = await readStreamAsText(stream);

    assert.match(output, /"reasoning":"Plan"/);
    assert.match(output, /"content":"Hello"/);
    assert.match(output, /"finish_reason":"end_turn"/);
    assert.match(output, /\[DONE\]/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter formats JSON error payloads with the upstream message and request id', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    createJsonResponse({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message:
            'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
        },
        request_id: 'req_011CaCHTz95wsUnfuqWxLQaq',
      }, 400)) as typeof fetch;

  try {
    const adapter = new AnthropicProviderAdapter();

    await assert.rejects(
      () =>
        adapter.chatStream(
          {
            model: 'claude-haiku-4-5-20251001',
            stream: true,
            messages: [{ role: 'user', content: 'Hello' }],
          },
          {
            requestId: 'request-1',
            userId: 'user-1',
            providerAccess: {
              apiKey: 'anthropic-token',
            },
          },
        ),
      /Anthropic streaming request failed with status 400: Your credit balance is too low to access the Anthropic API\. Please go to Plans & Billing to upgrade or purchase credits\. \(request_id: req_011CaCHTz95wsUnfuqWxLQaq\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter rejects gateway chat image attachments with a clear error', async () => {
  const adapter = new AnthropicProviderAdapter();

  await assert.rejects(
    () =>
      adapter.chat(
        {
          model: 'claude-sonnet-4-20250514',
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Describe this image' },
                {
                  type: 'image_url',
                  image_url: { url: 'https://example.com/cat.png' },
                },
              ],
            },
          ],
        },
        {
          requestId: 'request-1',
          userId: 'user-1',
          providerAccess: {
            apiKey: 'anthropic-token',
          },
        },
      ),
    /Anthropic gateway chat does not yet support image attachments/i,
  );
});
