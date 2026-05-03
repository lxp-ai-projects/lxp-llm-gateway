import assert from 'node:assert/strict';

import type { GatewayChatResponse } from '@lxp/contracts';
import type { ProviderModel } from './index.js';

export function createJsonResponse(
  body: unknown,
  status = 200,
  headers?: HeadersInit,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
  });
}

export async function readStreamAsText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  let output = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    output += new TextDecoder().decode(value);
  }

  return output;
}

export function assertProviderModelIds(
  models: ProviderModel[],
  expectedModelIds: string[],
): void {
  assert.deepEqual(
    models.map((model) => model.id),
    expectedModelIds,
  );
}

export function assertBasicChatResponseContract(input: {
  response: GatewayChatResponse;
  providerId: string;
  model: string;
  content: string;
  finishReason?: string | null;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): void {
  assert.equal(input.response.providerId, input.providerId);
  assert.equal(input.response.model, input.model);
  assert.equal(input.response.message.role, 'assistant');
  assert.equal(input.response.message.content, input.content);
  assert.equal(
    input.response.finishReason ?? null,
    input.finishReason ?? null,
  );
  assert.equal(input.response.usage?.promptTokens, input.promptTokens);
  assert.equal(
    input.response.usage?.completionTokens,
    input.completionTokens,
  );
  assert.equal(input.response.usage?.totalTokens, input.totalTokens);
}
