import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertCatalogProviderBaseUrlIsSafe,
  assertProviderAccessIsValid,
} from './admin-provider-access';

test('allows authenticated Ollama Cloud model catalog lookups', () => {
  assert.doesNotThrow(() =>
    assertCatalogProviderBaseUrlIsSafe('ollama', {
      baseUrl: 'https://ollama.com',
      apiKey: 'cloud-token',
    }),
  );
});

test('requires an Augure API token and permits its official HTTPS catalog URL', () => {
  assert.throws(() => assertProviderAccessIsValid('augure', {}));
  assert.doesNotThrow(() =>
    assertProviderAccessIsValid('augure', { apiKey: 'test-token' }),
  );
  assert.doesNotThrow(() =>
    assertCatalogProviderBaseUrlIsSafe('augure', {
      baseUrl: 'https://api.augureai.ca/v1',
      apiKey: 'test-token',
    }),
  );
  assert.throws(() =>
    assertCatalogProviderBaseUrlIsSafe('augure', {
      baseUrl: 'https://unrelated.example/v1',
    }),
  );
  assert.throws(() =>
    assertCatalogProviderBaseUrlIsSafe('augure', {
      baseUrl: 'http://api.augureai.ca/v1',
    }),
  );
});
