import { expect, test } from 'vitest';

import { router } from './router';

test('router declares the public and protected application routes', () => {
  const rootRoute = router.routes.find((route) => route.path === '/');
  const appRoute = router.routes.find((route) => route.path === '/app');

  expect(rootRoute).toBeDefined();
  expect(router.routes.some((route) => route.path === '/login')).toBe(true);
  expect(router.routes.some((route) => route.path === '/setup')).toBe(true);
  expect(router.routes.some((route) => route.path === '/terms')).toBe(true);
  expect(router.routes.some((route) => route.path === '/privacy')).toBe(true);
  expect(router.routes.some((route) => route.path === '/register')).toBe(true);
  expect(router.routes.some((route) => route.path === '/forgot-password')).toBe(
    true,
  );

  expect(appRoute?.children?.some((route) => route.path === 'providers')).toBe(
    true,
  );
  expect(appRoute?.children?.some((route) => route.path === 'profile')).toBe(
    true,
  );
  expect(appRoute?.children?.some((route) => route.path === 'chat')).toBe(true);
  expect(appRoute?.children?.some((route) => route.path === 'images')).toBe(
    true,
  );
  expect(
    appRoute?.children?.some((route) => route.path === 'admin/users'),
  ).toBe(true);
  expect(
    appRoute?.children?.some((route) => route.path === 'admin/analytics'),
  ).toBe(true);
  expect(
    appRoute?.children?.some((route) => route.path === 'admin/health'),
  ).toBe(true);
});
