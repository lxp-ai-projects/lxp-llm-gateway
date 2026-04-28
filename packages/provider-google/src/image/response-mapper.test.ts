import assert from 'node:assert/strict';
import test from 'node:test';

import { mapGoogleGenerateContentResponse } from './response-mapper.js';

test('mapGoogleGenerateContentResponse normalizes Gemini image payloads', () => {
  const response = mapGoogleGenerateContentResponse(
    'gemini-2.5-flash-image',
    {
      requestId: 'request-1',
      userId: 'user-1',
      providerAccess: {},
    },
    {
      responseId: 'response-1',
      candidates: [
        {
          content: {
            parts: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: 'generated-base64',
                },
              },
              {
                text: 'Generated with Gemini',
              },
            ],
          },
        },
      ],
    },
  );

  assert.equal(response.providerId, 'google');
  assert.equal(response.images[0]?.b64Json, 'generated-base64');
  assert.deepEqual(response.providerMetadata, {
    modelVersion: undefined,
    responseId: 'response-1',
    promptFeedback: undefined,
    textOutputs: ['Generated with Gemini'],
    usageMetadata: undefined,
  });
});
