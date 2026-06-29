import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import * as vm from 'node:vm';

import { waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { registerServiceWorker } from './lib/register-service-worker';

const serviceWorkerSource = readFileSync(
  path.join(process.cwd(), 'public', 'service-worker.js'),
  'utf8',
);

function loadServiceWorkerHarness() {
  const handlers = new Map<string, (event: unknown) => void>();
  const deletedKeys: string[] = [];

  const context = {
    caches: {
      keys: vi.fn(async () => ['lxp-admin-web-v1', 'old-cache']),
      delete: vi.fn(async (key: string) => {
        deletedKeys.push(key);
        return true;
      }),
    },
    self: {
      addEventListener: vi.fn(
        (type: string, handler: (event: unknown) => void) => {
          handlers.set(type, handler);
        },
      ),
      skipWaiting: vi.fn(async () => undefined),
      registration: {
        unregister: vi.fn(async () => true),
      },
      clients: {
        claim: vi.fn(async () => undefined),
      },
    },
    Promise,
    console,
  };

  vm.runInNewContext(serviceWorkerSource, context);

  return {
    handlers,
    deletedKeys,
    context,
  };
}

test('service worker unregisters itself and clears old caches', async () => {
  const { handlers, deletedKeys, context } = loadServiceWorkerHarness();
  const installWaitUntil = vi.fn((promise: Promise<unknown>) => promise);
  const activateWaitUntil = vi.fn((promise: Promise<unknown>) => promise);

  handlers.get('install')?.({ waitUntil: installWaitUntil });
  await installWaitUntil.mock.calls[0]?.[0];

  expect(context.self.skipWaiting).toHaveBeenCalled();

  handlers.get('activate')?.({ waitUntil: activateWaitUntil });
  await activateWaitUntil.mock.calls[0]?.[0];

  expect(deletedKeys).toEqual(['lxp-admin-web-v1', 'old-cache']);
  expect(context.self.registration.unregister).toHaveBeenCalled();
  expect(context.self.clients.claim).toHaveBeenCalled();
});

test('service worker still unregisters when one cache delete fails', async () => {
  const { handlers, context } = loadServiceWorkerHarness();
  const activateWaitUntil = vi.fn((promise: Promise<unknown>) => promise);

  vi.mocked(context.caches.delete).mockImplementation(async (key: string) => {
    if (key === 'old-cache') {
      throw new Error('cache is locked');
    }

    return true;
  });

  handlers.get('activate')?.({ waitUntil: activateWaitUntil });
  await activateWaitUntil.mock.calls[0]?.[0];

  expect(context.self.registration.unregister).toHaveBeenCalled();
  expect(context.self.clients.claim).toHaveBeenCalled();
});

test('registerServiceWorker unregisters existing service workers outside production', async () => {
  const unregister = vi.fn(async () => true);
  const getRegistrations = vi.fn(async () => [{ unregister }]);
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: {
      ...(globalThis.navigator),
      serviceWorker: {
        getRegistrations,
      },
    },
  });

  registerServiceWorker();
  await waitFor(() => expect(getRegistrations).toHaveBeenCalled());
  expect(unregister).toHaveBeenCalled();
});
