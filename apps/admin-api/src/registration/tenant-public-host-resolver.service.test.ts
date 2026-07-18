import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizePublicHostname,
  TenantPublicHostResolverService,
} from './tenant-public-host-resolver.service';

test('normalizePublicHostname normalizes casing, ports, and a trailing dot', () => {
  assert.equal(
    normalizePublicHostname('App.Example.COM:3002.'),
    'app.example.com',
  );
});

test('normalizePublicHostname rejects wildcard, IP, and malformed hostnames', () => {
  assert.equal(normalizePublicHostname('*.example.com'), null);
  assert.equal(normalizePublicHostname('127.0.0.1'), null);
  assert.equal(normalizePublicHostname('bad host'), null);
});

test('TenantPublicHostResolverService ignores forwarded host without configured proxy trust', () => {
  const previous = process.env.LXP_TRUST_PROXY;
  delete process.env.LXP_TRUST_PROXY;
  const resolver = new TenantPublicHostResolverService();
  assert.equal(
    resolver.resolveRequestHostname({
      header: (name: string) =>
        name === 'host' ? 'direct.example.com' : 'spoofed.example.com',
    } as never),
    'direct.example.com',
  );
  process.env.LXP_TRUST_PROXY = previous;
});

test('TenantPublicHostResolverService accepts the first forwarded host only with configured proxy trust', () => {
  const previous = process.env.LXP_TRUST_PROXY;
  process.env.LXP_TRUST_PROXY = 'true';
  const resolver = new TenantPublicHostResolverService();
  assert.equal(
    resolver.resolveRequestHostname({
      header: (name: string) =>
        name === 'x-forwarded-host'
          ? 'Public.Example.com:443, ignored.example.com'
          : 'direct.example.com',
    } as never),
    'public.example.com',
  );
  process.env.LXP_TRUST_PROXY = previous;
});
