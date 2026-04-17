import { beforeEach, expect, test, vi } from 'vitest';
import type { PropsWithChildren } from 'react';

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({
  render: renderMock,
}));
const registerServiceWorkerMock = vi.fn();
const routerProviderMock = vi.fn(() => null);

vi.mock('react-router-dom', () => ({
  RouterProvider: routerProviderMock,
}));

vi.mock('./app/providers', () => ({
  AppProviders: ({ children }: PropsWithChildren) => children,
}));

vi.mock('./app/router', () => ({
  router: { routes: [] },
}));

vi.mock('react-dom/client', () => ({
  default: {
    createRoot: createRootMock,
  },
  createRoot: createRootMock,
}));

vi.mock('./lib/register-service-worker', () => ({
  registerServiceWorker: registerServiceWorkerMock,
}));

beforeEach(() => {
  vi.resetModules();
  renderMock.mockClear();
  createRootMock.mockClear();
  registerServiceWorkerMock.mockClear();
  routerProviderMock.mockClear();

  document.body.innerHTML = '<div id="root"></div>';
});

test('main bootstraps the app root and registers the service worker', async () => {
  await import('./main');

  expect(registerServiceWorkerMock).toHaveBeenCalled();
  expect(createRootMock).toHaveBeenCalledWith(document.getElementById('root'));
  expect(renderMock).toHaveBeenCalledTimes(1);
}, 15_000);
