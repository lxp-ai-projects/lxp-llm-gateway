import { test, expect, vi, beforeEach } from 'vitest';

import { registerServiceWorker } from './register-service-worker';

beforeEach(() => {
  vi.restoreAllMocks();
});

test('registerServiceWorker does not register during development', async () => {
  const registerMock = vi.fn(async () => ({ scope: '/' }));
  const unregisterMock = vi.fn(async () => true);
  const getRegistrationsMock = vi.fn(async () => [{ unregister: unregisterMock }]);
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register: registerMock,
      getRegistrations: getRegistrationsMock,
    },
  });
  Object.defineProperty(window, 'isSecureContext', {
    configurable: true,
    value: true,
  });

  registerServiceWorker();
  window.dispatchEvent(new Event('load'));

  await Promise.resolve();

  expect(registerMock).not.toHaveBeenCalled();
  expect(getRegistrationsMock).toHaveBeenCalled();
  expect(unregisterMock).toHaveBeenCalled();
});

test('registerServiceWorker skips browsers without service worker support', () => {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: undefined,
  });
  registerServiceWorker();
});

test('registerServiceWorker swallows cleanup failures', async () => {
  const unregisterMock = vi.fn(async () => {
    throw new Error('cleanup failed');
  });
  const getRegistrationsMock = vi.fn(async () => [
    { unregister: unregisterMock },
  ]);

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      getRegistrations: getRegistrationsMock,
    },
  });

  registerServiceWorker();
  await Promise.resolve();
  await Promise.resolve();

  expect(getRegistrationsMock).toHaveBeenCalled();
  expect(unregisterMock).toHaveBeenCalled();
});
