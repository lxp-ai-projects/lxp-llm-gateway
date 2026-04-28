import assert from 'node:assert/strict';
import test from 'node:test';

import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import { mapOpenAiImageResponse } from './response-mapper.js';

test('mapOpenAiImageResponse normalizes OpenAI image payloads', () => {
  const context = {
    requestId: 'request-1',
    userId: 'user-1',
    providerAccess: {},
  } satisfies ProviderExecutionContext;

  const response = mapOpenAiImageResponse('gpt-image-1.5', context, {
    created: 1234,
    data: [
      {
        b64_json: 'base64-image',
        revised_prompt: 'Refined prompt',
      },
      {
        url: 'https://cdn.example.com/generated.jpg',
      },
    ],
  });

  assert.equal(response.requestId, 'request-1');
  assert.equal(response.providerId, 'openai');
  assert.equal(response.model, 'gpt-image-1.5');
  assert.deepEqual(response.providerMetadata, { created: 1234 });
  assert.deepEqual(response.images, [
    {
      b64Json: 'base64-image',
      revisedPrompt: 'Refined prompt',
    },
    {
      url: 'https://cdn.example.com/generated.jpg',
    },
  ]);
});
