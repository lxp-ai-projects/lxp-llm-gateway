import assert from 'node:assert/strict';
import test from 'node:test';

import { AuthCookieService } from './auth-cookie.service';

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => void,
) {
  const previousValues = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previousValues.set(key, process.env[key]);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of previousValues.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

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
  withEnv(
    {
      ADMIN_WEB_ORIGIN: 'http://localhost:3003',
      LXP_COOKIE_DOMAIN: undefined,
      LXP_COOKIE_SECURE: undefined,
    },
    () => {
      const service = new AuthCookieService();
      const recorder = createResponseRecorder();

      service.setAccessTokenCookie(recorder.response as never, 'token-1', 1000);

      assert.equal(recorder.cookies.length, 1);
      assert.equal(recorder.cookies[0]?.options.secure, false);
      assert.equal(recorder.cookies[0]?.options.domain, undefined);
      assert.equal(recorder.cookies[0]?.options.path, '/');
    },
  );
});

test('AuthCookieService can share secure cookies across admin and gateway subdomains', () => {
  withEnv(
    {
      ADMIN_WEB_ORIGIN: 'https://llm-gateway-admin.laurie-x-patrick.dev',
      LXP_COOKIE_DOMAIN: '.laurie-x-patrick.dev',
      LXP_COOKIE_SECURE: 'true',
    },
    () => {
      const service = new AuthCookieService();
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
    },
  );
});
