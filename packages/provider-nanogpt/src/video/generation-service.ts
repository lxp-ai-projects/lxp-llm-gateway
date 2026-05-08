import type {
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { NanoGptVideoApiClient } from './api-client.js';
import { buildNanoGptVideoGenerationRequest } from './request-mapper.js';
import {
  extractVideoUrls,
  mapNanoGptAcceptedVideoJob,
  mapNanoGptStatusVideoJob,
} from './response-mapper.js';

export class NanoGptVideoGenerationService {
  constructor(private readonly client: NanoGptVideoApiClient) {}

  async submit(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const response = await this.client.submitVideoGeneration(
      context,
      await buildNanoGptVideoGenerationRequest(request),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('NanoGPT video request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapNanoGptAcceptedVideoJob
    >[2];
    return {
      ...mapNanoGptAcceptedVideoJob(request.model ?? 'unknown-model', context, payload),
      prompt: request.prompt,
    };
  }

  async getJob(
    requestedModel: string,
    jobId: string,
    prompt: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const response = await this.client.getVideoStatus(context, jobId);

    if (!response.ok) {
      throw await buildProviderHttpError('NanoGPT video status request', response);
    }

    const payload = (await response.json()) as Parameters<
      typeof mapNanoGptStatusVideoJob
    >[2];
    return {
      ...mapNanoGptStatusVideoJob(requestedModel, context, payload),
      prompt,
    };
  }

  async downloadOutput(
    requestedModel: string,
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const statusResponse = await this.client.getVideoStatus(context, jobId);
    if (!statusResponse.ok) {
      throw await buildProviderHttpError(
        'NanoGPT video status request',
        statusResponse,
      );
    }

    const payload = (await statusResponse.json()) as Parameters<
      typeof mapNanoGptStatusVideoJob
    >[2];
    const contentUrl = extractVideoUrls(payload)[outputIndex];
    if (!contentUrl) {
      throw new Error(`NanoGPT video output ${outputIndex} is not available yet.`);
    }

    const downloadResponse = await this.client.downloadVideoContent(contentUrl);
    if (!downloadResponse.ok) {
      throw await buildProviderHttpError(
        'NanoGPT video download request',
        downloadResponse,
      );
    }

    if (!downloadResponse.body) {
      throw new Error('NanoGPT video download did not include a body.');
    }

    return downloadResponse.body;
  }
}
