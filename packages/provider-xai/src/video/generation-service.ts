import type {
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { XAiVideoApiClient } from './api-client.js';
import { buildXAiVideoGenerationRequest } from './request-mapper.js';
import {
  mapXAiAcceptedVideoJob,
  mapXAiVideoJob,
} from './response-mapper.js';

export class XAiVideoGenerationService {
  constructor(private readonly client: XAiVideoApiClient) {}

  async submit(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const mappedRequest = await buildXAiVideoGenerationRequest(request);
    const response =
      mappedRequest.endpoint === '/videos/edits'
        ? await this.client.submitEdit(context, mappedRequest.body)
        : mappedRequest.endpoint === '/videos/extensions'
          ? await this.client.submitExtension(context, mappedRequest.body)
          : await this.client.submitGeneration(context, mappedRequest.body);

    if (!response.ok) {
      throw await buildProviderHttpError('xAI video request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapXAiAcceptedVideoJob
    >[2];
    return {
      ...mapXAiAcceptedVideoJob(request.model ?? 'unknown-model', context, payload),
      prompt: request.prompt,
    };
  }

  async getJob(
    requestedModel: string,
    jobId: string,
    prompt: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const response = await this.client.getVideoJob(context, jobId);

    if (!response.ok) {
      throw await buildProviderHttpError('xAI video status request', response);
    }

    const payload = (await response.json()) as Parameters<typeof mapXAiVideoJob>[2];
    return {
      ...mapXAiVideoJob(requestedModel, context, payload),
      prompt,
    };
  }

  async downloadOutput(
    requestedModel: string,
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const job = await this.getJob(requestedModel, jobId, '', context);
    const contentUrl = job.outputs[outputIndex]?.contentUrl;
    if (!contentUrl) {
      throw new Error(`xAI video output ${outputIndex} is not available yet.`);
    }

    const response = await this.client.downloadVideoContent(context, contentUrl);
    if (!response.ok) {
      throw await buildProviderHttpError('xAI video download request', response);
    }

    if (!response.body) {
      throw new Error('xAI video download did not include a body.');
    }

    return response.body;
  }
}
