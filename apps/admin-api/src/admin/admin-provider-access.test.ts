import assert from 'node:assert/strict';
import test from 'node:test';

import { assertCatalogProviderBaseUrlIsSafe } from './admin-provider-access';

test('allows authenticated Ollama Cloud model catalog lookups', () => {
  assert.doesNotThrow(() =>
    assertCatalogProviderBaseUrlIsSafe('ollama', {
      baseUrl: 'https://ollama.com',
      apiKey: 'cloud-token',
    }),
  );
});
