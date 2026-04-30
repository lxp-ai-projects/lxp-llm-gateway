import assert from 'node:assert/strict';
import test from 'node:test';

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
    assert.deepEqual(models, [
      {
        id: 'claude-sonnet-4-20250514',
        displayName: 'Claude Sonnet 4',
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter maps gateway messages into the Messages API payload', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init });

    return new Response(
      JSON.stringify({
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
      }),
      {
        status: 200,
        headers: { 'content-type': 'application/json' },
      },
    );
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
      stream?: boolean;
    };

    assert.equal(calls[0]?.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(body.system, 'You are helpful.');
    assert.deepEqual(body.messages, [{ role: 'user', content: 'Hello' }]);
    assert.equal(body.stream, false);
    assert.equal(response.providerId, 'anthropic');
    assert.equal(response.message.content, 'Hello from Claude');
    assert.equal(response.usage?.totalTokens, 27);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter transforms Anthropic SSE streams into gateway SSE chunks', async () => {
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

    const reader = stream.getReader();
    let output = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      output += new TextDecoder().decode(value);
    }

    assert.match(output, /"reasoning":"Plan"/);
    assert.match(output, /"content":"Hello"/);
    assert.match(output, /"finish_reason":"end_turn"/);
    assert.match(output, /\[DONE\]/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('AnthropicProviderAdapter formats JSON error payloads with the upstream message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        type: 'error',
        error: {
          type: 'invalid_request_error',
          message:
            'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.',
        },
        request_id: 'req_011CaCHTz95wsUnfuqWxLQaq',
      }),
      {
        status: 400,
        headers: { 'content-type': 'application/json' },
      },
    )) as typeof fetch;

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
      /Anthropic streaming request failed with status 400: Your credit balance is too low to access the Anthropic API\. Please go to Plans & Billing to upgrade or purchase credits\./,
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
