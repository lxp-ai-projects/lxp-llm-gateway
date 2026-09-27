import { expect, test } from 'vitest';

import {
  buildDefaultModelOptions,
  validateProviderCredentialInput,
} from './provider-utils';

test('buildDefaultModelOptions removes duplicate model ids', () => {
  const options = buildDefaultModelOptions([
    { id: 'mistral-large-2512', displayName: 'Mistral Large 2512' },
    { id: 'mistral-small-2512', displayName: 'Mistral Small 2512' },
    { id: 'mistral-large-2512', displayName: 'Mistral Large 2512 Duplicate' },
  ]);

  expect(options).toEqual([
    { value: 'mistral-large-2512', label: 'Mistral Large 2512' },
    { value: 'mistral-small-2512', label: 'Mistral Small 2512' },
  ]);
});

test('Augure credentials require an API token', () => {
  expect(
    validateProviderCredentialInput({
      providerId: 'augure',
      apiToken: '',
      baseUrl: '',
    }),
  ).toBe('providerCredentialForm.validation.tokenRequired.augure');
  expect(
    validateProviderCredentialInput({
      providerId: 'augure',
      apiToken: 'test-token',
      baseUrl: '',
    }),
  ).toBeNull();
});
