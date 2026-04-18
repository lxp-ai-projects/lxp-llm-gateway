import { test, expect, vi, beforeEach } from 'vitest';

import { registerServiceWorker } from './register-service-worker';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('registerServiceWorker registers on secure contexts after load', async () => {
  const registerMock = vi.fn(async () => ({ scope: '/' }));
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: registerMock,
    },
  });
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });

  registerServiceWorker();
  window.dispatchEvent(new Event('load'));

  await Promise.resolve();

  expect(registerMock).toHaveBeenCalledWith('/service-worker.js');
});

test('registerServiceWorker skips browsers without service worker support', () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: undefined,
  });
  registerServiceWorker();
});
