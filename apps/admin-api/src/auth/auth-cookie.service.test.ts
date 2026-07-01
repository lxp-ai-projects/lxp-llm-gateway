import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthCookieService } from './auth-cookie.service';

function createResponseRecorder() {
  const cookies: Array<{
    name: string;
    value: string;
    options: Record<string, unknown>;
  }> = [];
  const clearedCookies: Array<{
    name: string;
    options: Record<string, unknown>;
  }> = [];

  return {
    response: {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie(name: string, options: Record<string, unknown>) {
        clearedCookies.push({ name, options });
      },
    },
    cookies,
    clearedCookies,
  };
}

test('AuthCookieService defaults to non-secure host-only cookies for local development', () => {
  const service = new AuthCookieService({
    adminWebOrigin: 'http://localhost:3003',
  });
  const recorder = createResponseRecorder();

  service.setAccessTokenCookie(recorder.response as never, 'token-1', 1000);

  assert.equal(recorder.cookies.length, 1);
  assert.equal(recorder.cookies[0]?.options.secure, false);
  assert.equal(recorder.cookies[0]?.options.domain, undefined);
  assert.equal(recorder.cookies[0]?.options.path, '/');
});

test('AuthCookieService can share secure cookies across admin and gateway subdomains', () => {
  const service = new AuthCookieService({
    adminWebOrigin: 'https://llm-gateway-admin.laurie-x-patrick.dev',
    cookieDomain: '.laurie-x-patrick.dev',
    secureCookies: true,
  });
  const recorder = createResponseRecorder();

  service.setAccessTokenCookie(recorder.response as never, 'token-1', 1000);
  service.setRefreshTokenCookie(recorder.response as never, 'token-2', 2000);
  service.clearAccessTokenCookie(recorder.response as never);

  assert.equal(recorder.cookies.length, 2);
  assert.equal(
    recorder.cookies[0]?.options.domain,
    '.laurie-x-patrick.dev',
  );
  assert.equal(recorder.cookies[0]?.options.secure, true);
  assert.equal(recorder.cookies[1]?.options.path, '/api/v1/auth');
  assert.equal(
    recorder.clearedCookies[0]?.options.domain,
    '.laurie-x-patrick.dev',
  );
  assert.equal(recorder.clearedCookies[0]?.options.secure, true);
});
