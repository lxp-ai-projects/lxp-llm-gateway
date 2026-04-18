import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

import { waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

const serviceWorkerSource = readFileSync(
  path.join(process.cwd(), 'public', 'service-worker.js'),
  'utf8',
);

function loadServiceWorkerHarness() {
  const handlers = new Map<string, (event: unknown) => void>();
  const cacheStore = new Map<string, unknown>();
  const deletedKeys: string[] = [];
  const cacheApi = {
    addAll: vi.fn(async () => undefined),
    put: vi.fn(async (request: Request, response: Response) => {
      cacheStore.set(request.url, response);
    }),
  };

  const context = {
    caches: {
      open: vi.fn(async () => cacheApi),
      keys: vi.fn(async () => ['lxp-admin-web-v1', 'old-cache']),
      delete: vi.fn(async (key: string) => {
        deletedKeys.push(key);
        return true;
      }),
      match: vi.fn(
        async (request: Request) => cacheStore.get(request.url) ?? null,
      ),
    },
    fetch: vi.fn(),
    self: {
      addEventListener: vi.fn(
        (type: string, handler: (event: unknown) => void) => {
          handlers.set(type, handler);
        },
      ),
      skipWaiting: vi.fn(async () => undefined),
      clients: {
        claim: vi.fn(async () => undefined),
      },
    },
    Request,
    Response,
    Promise,
    console,
  };

  vm.runInNewContext(serviceWorkerSource, context);

  return {
    handlers,
    cacheApi,
    cacheStore,
    deletedKeys,
    context,
  };
}

test('service worker installs and activates the expected cache lifecycle', async () => {
  const { handlers, cacheApi, deletedKeys, context } =
    loadServiceWorkerHarness();
  const installWaitUntil = vi.fn((promise: Promise<unknown>) => promise);
  const activateWaitUntil = vi.fn((promise: Promise<unknown>) => promise);

  handlers.get('install')?.({ waitUntil: installWaitUntil });
  await installWaitUntil.mock.calls[0]?.[0];

  expect(context.caches.open).toHaveBeenCalledWith('lxp-admin-web-v1');
  expect(cacheApi.addAll).toHaveBeenCalledWith([
    '/',
    '/index.html',
    '/manifest.webmanifest',
    '/pwa-192.svg',
    '/pwa-512.svg',
  ]);
  expect(context.self.skipWaiting).toHaveBeenCalled();

  handlers.get('activate')?.({ waitUntil: activateWaitUntil });
  await activateWaitUntil.mock.calls[0]?.[0];

  expect(deletedKeys).toEqual(['old-cache']);
  expect(context.self.clients.claim).toHaveBeenCalled();
});

test('service worker bypasses non-GET fetches and caches successful GET responses', async () => {
  const { handlers, cacheApi, context } = loadServiceWorkerHarness();
  const respondWith = vi.fn();

  handlers.get('fetch')?.({
    request: new Request('https://example.com/post', { method: 'POST' }),
    respondWith,
  });

  expect(respondWith).not.toHaveBeenCalled();

  const networkResponse = {
    status: 200,
    type: 'basic',
    clone: vi.fn(() => networkResponse),
    text: vi.fn(async () => 'network'),
  };
  vi.mocked(context.fetch).mockResolvedValueOnce(
    networkResponse as unknown as Response,
  );

  handlers.get('fetch')?.({
    request: new Request('https://example.com/data'),
    respondWith,
  });

  const response = await respondWith.mock.calls[0][0];
  expect(await response.text()).toBe('network');
  await waitFor(() => expect(cacheApi.put).toHaveBeenCalled());
});

test('service worker falls back to the cached response when the network fails', async () => {
  const { handlers, cacheStore, context } = loadServiceWorkerHarness();
  const request = new Request('https://example.com/data');
  const cachedResponse = new Response('cached', { status: 200 });
  cacheStore.set(request.url, cachedResponse);
  const respondWith = vi.fn();

  vi.mocked(context.fetch).mockRejectedValueOnce(new Error('offline'));

  handlers.get('fetch')?.({
    request,
    respondWith,
  });

  const response = await respondWith.mock.calls[0][0];
  expect(await response.text()).toBe('cached');
});
