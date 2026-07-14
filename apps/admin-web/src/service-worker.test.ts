import { waitFor } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { registerServiceWorker } from './lib/register-service-worker';

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

test('admin-web no longer ships a service worker script', async () => {
  const { access } = await import('node:fs/promises');
  const { constants } = await import('node:fs');
  const filePath = new URL('../public/service-worker.js', import.meta.url);

  await expect(access(filePath, constants.F_OK)).rejects.toBeDefined();
});
