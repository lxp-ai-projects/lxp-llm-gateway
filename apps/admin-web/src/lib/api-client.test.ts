import { beforeEach, expect, test, vi } from 'vitest';

import {
  SESSION_TIMEOUT_MESSAGE_STORAGE_KEY,
  adminApiClient,
  gatewayApiClient,
} from './api-client';

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  });
}

function textResponse(body: string, init?: ResponseInit) {
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
    },
    ...init,
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  vi.stubGlobal('fetch', vi.fn());
});

test('adminApiClient.getRuntimeConfig falls back to safe defaults when the request fails', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('offline'));

  await expect(adminApiClient.getRuntimeConfig()).resolves.toEqual({
    registrationEnabled: false,
    forgotPasswordEnabled: false,
    gatewayOnline: true,
    supportedProviders: [
      { providerId: 'nanogpt', displayName: 'NanoGPT' },
      { providerId: 'openrouter', displayName: 'OpenRouter' },
      { providerId: 'ollama', displayName: 'Ollama' },
      { providerId: 'groq', displayName: 'Groq' },
      { providerId: 'xai', displayName: 'xAI Grok' },
      { providerId: 'openai', displayName: 'OpenAI' },
      { providerId: 'anthropic', displayName: 'Anthropic Claude' },
    ],
  });
});

test('adminApiClient.getSession retries after a successful session refresh', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(textResponse('', { status: 200 }))
    .mockResolvedValueOnce(
      jsonResponse({
        userUuid: 'user-1',
        email: 'patrick@example.com',
        displayName: 'Patrick',
        status: 'active',
        roles: ['admin'],
      }),
    );

  await expect(adminApiClient.getSession()).resolves.toEqual(
    expect.objectContaining({
      userUuid: 'user-1',
      email: 'patrick@example.com',
    }),
  );

  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/api/v1/auth/refresh'),
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  );
});

test('adminApiClient.getSession returns null and stores the timeout message when refresh fails', async () => {
  const assignMock = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      origin: 'http://localhost:3003',
      assign: assignMock,
    },
  });

  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(
      textResponse('{"message":"Refresh token is required."}', { status: 401 }),
    );

  await expect(adminApiClient.getSession()).resolves.toBeNull();
  expect(
    window.sessionStorage.getItem(SESSION_TIMEOUT_MESSAGE_STORAGE_KEY),
  ).toBe('Session is timed out, you have to login again.');
  expect(assignMock).toHaveBeenCalledWith('http://localhost:3003/login');
});

test('adminApiClient.getSession throws on non-refreshable backend failures', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));

  await expect(adminApiClient.getSession()).rejects.toThrow(
    'Session request failed with 500',
  );
});

test('adminApiClient.logout retries once after a refreshable unauthorized response', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(textResponse('unauthorized', { status: 401 }))
    .mockResolvedValueOnce(textResponse('', { status: 200 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));

  await expect(adminApiClient.logout()).resolves.toBeUndefined();

  expect(fetch).toHaveBeenNthCalledWith(
    3,
    expect.stringContaining('/api/v1/auth/logout'),
    expect.objectContaining({ method: 'POST', credentials: 'include' }),
  );
});

test('adminApiClient.exportConversation returns a blob and extracted filename', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(new Blob(['archive']), {
      status: 200,
      headers: {
        'content-disposition': 'attachment; filename="conversation.json"',
      },
    }),
  );

  const result = await adminApiClient.exportConversation({
    id: 'conversation-1',
    title: 'Thread',
    model: 'glm',
    providerId: 'nanogpt',
    messages: [],
    updatedAt: '2026-04-17T00:00:00.000Z',
  });

  expect(result.fileName).toBe('conversation.json');
  expect(result.blob.size).toBeGreaterThan(0);
});

test('adminApiClient.exportConversationArchive retries after refresh and decodes utf8 filenames', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(textResponse('unauthorized', { status: 401 }))
    .mockResolvedValueOnce(textResponse('', { status: 200 }))
    .mockResolvedValueOnce(
      new Response(new Blob(['archive']), {
        status: 200,
        headers: {
          'content-disposition':
            "attachment; filename*=UTF-8''archive-%C3%A9.zip",
        },
      }),
    );

  const result = await adminApiClient.exportConversationArchive([]);

  expect(result.fileName).toBe('archive-é.zip');
  expect(fetch).toHaveBeenNthCalledWith(
    2,
    expect.stringContaining('/api/v1/auth/refresh'),
    expect.objectContaining({ method: 'POST' }),
  );
});

test('adminApiClient.importConversationFile uploads multipart form data', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    jsonResponse({
      conversations: [{ id: 'conversation-1' }],
    }),
  );

  const file = new File(['{}'], 'conversation.json', {
    type: 'application/json',
  });
  await adminApiClient.importConversationFile(file);

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/chat-transfers/import'),
    expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      body: expect.any(FormData),
    }),
  );
});

test('adminApiClient.importConversationFile retries after refreshable unauthorized responses', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(textResponse('unauthorized', { status: 401 }))
    .mockResolvedValueOnce(textResponse('', { status: 200 }))
    .mockResolvedValueOnce(jsonResponse({ conversations: [] }));

  const file = new File(['{}'], 'conversation.json', {
    type: 'application/json',
  });
  await expect(adminApiClient.importConversationFile(file)).resolves.toEqual({
    conversations: [],
  });
});

test('gatewayApiClient.chat surfaces timeout aborts with a user-facing error', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(
    new DOMException('Aborted', 'AbortError'),
  );

  await expect(
    gatewayApiClient.chat({
      stream: false,
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  ).rejects.toThrow(
    'The request timed out before the gateway returned a response.',
  );
});

test('gatewayApiClient.getModels encodes providerId in the query string', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    jsonResponse({
      providerId: 'nano gpt',
      models: [],
    }),
  );

  await gatewayApiClient.getModels('nano gpt');

  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining('/api/v1/models?providerId=nano%20gpt'),
    expect.any(Object),
  );
});

test('gatewayApiClient.chatStream fails clearly when the stream body is missing', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 200 }));

  await expect(
    gatewayApiClient.chatStream(
      {
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      { onChunk: vi.fn() },
    ),
  ).rejects.toThrow('The gateway stream did not include a response body.');
});

test('gatewayApiClient.chatStream emits reasoning and content deltas from SSE blocks', async () => {
  const onChunk = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"reasoning":"Think"},"finish_reason":null}]}\n\n',
        ),
      );
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n\n',
        ),
      );
      controller.close();
    },
  });

  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'x-request-id': 'request-1',
      },
    }),
  );

  const result = await gatewayApiClient.chatStream(
    {
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
    },
    { onChunk },
  );

  expect(onChunk).toHaveBeenCalledWith(
    expect.objectContaining({
      requestId: 'request-1',
      reasoningDelta: 'Think',
    }),
  );
  expect(onChunk).toHaveBeenCalledWith(
    expect.objectContaining({
      requestId: 'request-1',
      contentDelta: 'Hello',
      finishReason: 'stop',
    }),
  );
  expect(result).toEqual({
    requestId: 'request-1',
    receivedReasoning: true,
    receivedContent: true,
    finishReason: 'stop',
  });
});

test('gatewayApiClient.chatStream processes a final SSE block without a trailing separator', async () => {
  const onChunk = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"Tail"},"finish_reason":"stop"}]}',
        ),
      );
      controller.close();
    },
  });

  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    }),
  );

  const result = await gatewayApiClient.chatStream(
    {
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
    },
    { onChunk },
  );

  expect(onChunk).toHaveBeenCalledWith(
    expect.objectContaining({ contentDelta: 'Tail', finishReason: 'stop' }),
  );
  expect(result.receivedContent).toBe(true);
});
