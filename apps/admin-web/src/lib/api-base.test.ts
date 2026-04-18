import { beforeEach, expect, test, vi } from 'vitest';

import {
  chatStreamWithSessionRefresh,
  refreshBrowserSession,
  request,
  requestBlobWithSessionRefresh,
  SESSION_TIMEOUT_MESSAGE_STORAGE_KEY,
  uploadFileWithSessionRefresh,
} from './api-base';

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

test('request resolves undefined on 204 and surfaces plain-text backend errors', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(textResponse('provider exploded', { status: 500 }));

  await expect(request('http://localhost:3001/api/v1/health')).resolves.toBeUndefined();
  await expect(request('http://localhost:3001/api/v1/health')).rejects.toThrow(
    'provider exploded',
  );
});

test('refreshBrowserSession shares an in-flight refresh request', async () => {
  let resolveRefresh: (() => void) | null = null;
  vi.mocked(fetch).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        resolveRefresh = () => resolve(textResponse('', { status: 200 }));
      }) as Promise<Response>,
  );

  const first = refreshBrowserSession();
  const second = refreshBrowserSession();
  resolveRefresh?.();

  await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test('refreshBrowserSession keeps non-timeout failures local without redirecting the browser', async () => {
  const assignMock = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...window.location,
      origin: 'http://localhost:3003',
      assign: assignMock,
    },
  });

  vi.mocked(fetch).mockResolvedValueOnce(textResponse('backend unavailable', { status: 500 }));

  await expect(refreshBrowserSession()).rejects.toThrow('backend unavailable');
  expect(window.sessionStorage.getItem(SESSION_TIMEOUT_MESSAGE_STORAGE_KEY)).toBeNull();
  expect(assignMock).not.toHaveBeenCalled();
});

test('requestBlobWithSessionRefresh and uploadFileWithSessionRefresh surface non-refreshable errors', async () => {
  vi.mocked(fetch)
    .mockResolvedValueOnce(textResponse('archive export failed', { status: 500 }))
    .mockResolvedValueOnce(textResponse('import failed', { status: 500 }));

  await expect(
    requestBlobWithSessionRefresh('http://localhost:3002/export', { method: 'POST' }, false),
  ).rejects.toThrow('archive export failed');

  const file = new File(['{}'], 'conversation.json', { type: 'application/json' });
  await expect(
    uploadFileWithSessionRefresh('http://localhost:3002/import', file, false),
  ).rejects.toThrow('import failed');
});

test('chatStreamWithSessionRefresh retries after session refresh and ignores empty SSE blocks', async () => {
  const onChunk = vi.fn();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('event: ping\n\n'));
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n\n',
        ),
      );
      controller.close();
    },
  });

  vi.mocked(fetch)
    .mockResolvedValueOnce(textResponse('unauthorized', { status: 401 }))
    .mockResolvedValueOnce(textResponse('', { status: 200 }))
    .mockResolvedValueOnce(
      new Response(stream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'x-request-id': 'request-1',
        },
      }),
    );

  const result = await chatStreamWithSessionRefresh(
    {
      stream: true,
      messages: [{ role: 'user', content: 'Hello' }],
    },
    { onChunk },
    false,
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
    receivedReasoning: false,
    receivedContent: true,
    finishReason: 'stop',
  });
});

test('chatStreamWithSessionRefresh surfaces non-abort stream errors', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          'data: {"choices":[{"delta":{"content":"Hello"},"finish_reason":"stop"}]}\n\n',
        ),
      );
      controller.error(new Error('socket reset'));
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

  await expect(
    chatStreamWithSessionRefresh(
      {
        stream: true,
        messages: [{ role: 'user', content: 'Hello' }],
      },
      { onChunk: vi.fn() },
      false,
    ),
  ).rejects.toThrow('socket reset');
});
