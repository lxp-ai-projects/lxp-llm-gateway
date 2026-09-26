import type {
  GatewayVideoGenerationJob,
  GatewayVideoGenerationRequest,
  GatewayVideoReference,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  parseDataUrlReference,
  resolveGatewayImageReference,
  type ProviderExecutionContext,
} from '@lxp/provider-sdk';

import { GoogleVideoApiClient } from './api-client.js';
import { GOOGLE_OMNI_MODEL, isGoogleVeoModel } from './catalog.js';

type GoogleVideoContent = {
  type?: string;
  mime_type?: string;
  data?: string;
  uri?: string;
};

type GoogleInteraction = {
  id?: string;
  status?: string;
  error?: { message?: string };
  steps?: Array<{ type?: string; content?: GoogleVideoContent[] }>;
};

type GoogleVideoOperation = {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: { uri?: string } }>;
    };
  };
};

export class GoogleVideoGenerationService {
  constructor(
    private readonly client: GoogleVideoApiClient,
    private readonly lookupHostname: (
      hostname: string,
    ) => Promise<Array<{ address: string; family: number }>>,
  ) {}

  async submit(
    request: GatewayVideoGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const model = request.model ?? '';
    if (isGoogleVeoModel(model)) {
      const response = await this.client.post(
        context,
        `models/${model}:predictLongRunning`,
        await this.buildVeoRequest(request),
      );
      if (!response.ok)
        throw await buildProviderHttpError('Google Veo request', response);
      const operation = (await response.json()) as GoogleVideoOperation;
      if (!operation.name)
        throw new Error('Google Veo response has no operation name.');
      return this.mapVeoJob(operation, model, request.prompt, context);
    }
    if (model === GOOGLE_OMNI_MODEL) {
      const response = await this.client.post(
        context,
        'interactions',
        await this.buildOmniRequest(request),
      );
      if (!response.ok)
        throw await buildProviderHttpError('Google Omni request', response);
      const interaction = (await response.json()) as GoogleInteraction;
      if (!interaction.id)
        throw new Error('Google Omni response has no interaction id.');
      return this.mapOmniJob(interaction, request.prompt, context);
    }
    throw new Error(`Unsupported Google video model: ${model}.`);
  }

  async getJob(
    jobId: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const model =
      typeof context.metadata?.requestedModel === 'string'
        ? context.metadata.requestedModel
        : 'unknown-model';
    const prompt =
      typeof context.metadata?.prompt === 'string'
        ? context.metadata.prompt
        : '';
    if (jobId.startsWith('omni:')) {
      const interactionId = jobId.slice('omni:'.length);
      const response = await this.client.get(
        context,
        `interactions/${interactionId}`,
      );
      if (!response.ok)
        throw await buildProviderHttpError('Google Omni status', response);
      return this.mapOmniJob(
        (await response.json()) as GoogleInteraction,
        prompt,
        context,
      );
    }
    const response = await this.client.get(context, jobId);
    if (!response.ok)
      throw await buildProviderHttpError('Google Veo status', response);
    return this.mapVeoJob(
      (await response.json()) as GoogleVideoOperation,
      model,
      prompt,
      context,
    );
  }

  async downloadOutput(
    jobId: string,
    outputIndex: number,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const job = await this.getJob(jobId, context);
    const contentUrl = job.outputs[outputIndex]?.contentUrl;
    if (!contentUrl) throw new Error('Google video output is not ready.');
    if (contentUrl.startsWith('google-interaction:')) {
      const interactionId = contentUrl.slice('google-interaction:'.length);
      const response = await this.client.get(
        context,
        `interactions/${interactionId}`,
      );
      if (!response.ok)
        throw await buildProviderHttpError('Google Omni output', response);
      const video = this.readOmniVideo(
        (await response.json()) as GoogleInteraction,
      );
      if (!video?.data)
        throw new Error('Google Omni video bytes are unavailable.');
      return new ReadableStream({
        start(controller) {
          controller.enqueue(Buffer.from(video.data!, 'base64'));
          controller.close();
        },
      });
    }

    const downloadUrl = jobId.startsWith('omni:')
      ? await this.resolveOmniDownloadUrl(contentUrl, context)
      : contentUrl;
    const response = await this.client.download(context, downloadUrl);
    if (!response.ok)
      throw await buildProviderHttpError('Google video download', response);
    if (!response.body) throw new Error('Google video download has no body.');
    return response.body;
  }

  private async buildVeoRequest(request: GatewayVideoGenerationRequest) {
    this.assertSharedRequest(request);
    if (
      request.frameImages?.length ||
      request.size ||
      request.providerOptions
    ) {
      throw new Error(
        'Google Veo frame images, size and provider options are not enabled on this route.',
      );
    }
    if (request.referenceImages && request.referenceImages.length > 1) {
      throw new Error(
        'Google Veo currently accepts one reference image on this route.',
      );
    }
    const duration = request.durationSeconds ?? 8;
    const resolution = request.resolution ?? '720p';
    if (
      ![4, 6, 8].includes(duration) ||
      !['720p', '1080p', '4k'].includes(resolution) ||
      (request.model?.includes('lite') && resolution === '4k') ||
      (resolution !== '720p' && duration !== 8)
    ) {
      throw new Error(
        'Unsupported Google Veo duration and resolution combination.',
      );
    }
    const image = request.referenceImages?.[0]
      ? await this.resolveImage(request.referenceImages[0])
      : undefined;
    return {
      instances: [
        {
          prompt: request.prompt,
          ...(image ? { image: { inlineData: image } } : {}),
        },
      ],
      parameters: {
        durationSeconds: String(duration),
        resolution,
        aspectRatio: request.aspectRatio ?? '16:9',
        numberOfVideos: 1,
        ...(request.seed !== undefined ? { seed: request.seed } : {}),
      },
    };
  }

  private async buildOmniRequest(request: GatewayVideoGenerationRequest) {
    this.assertSharedRequest(request);
    if (
      request.durationSeconds !== undefined ||
      request.seed !== undefined ||
      request.size ||
      request.providerOptions ||
      request.frameImages?.length
    ) {
      throw new Error(
        'Google Omni does not support these video parameters on this route.',
      );
    }
    if (request.referenceImages && request.referenceImages.length > 1) {
      throw new Error(
        'Google Omni currently accepts one reference image on this route.',
      );
    }
    if (
      request.resolution &&
      !['360p', '720p', '1080p', '4k'].includes(request.resolution)
    ) {
      throw new Error('Unsupported Google Omni resolution.');
    }
    const image = request.referenceImages?.[0]
      ? await this.resolveImage(request.referenceImages[0])
      : undefined;
    return {
      model: GOOGLE_OMNI_MODEL,
      input: image
        ? [
            { type: 'image', data: image.data, mime_type: image.mimeType },
            { type: 'text', text: request.prompt },
          ]
        : request.prompt,
      response_format: {
        type: 'video',
        delivery: 'uri',
        aspect_ratio: request.aspectRatio ?? '16:9',
        ...(request.resolution ? { resolution: request.resolution } : {}),
      },
    };
  }

  private assertSharedRequest(request: GatewayVideoGenerationRequest) {
    if (!request.prompt.trim())
      throw new Error('A Google video prompt is required.');
    if (
      request.aspectRatio &&
      !['16:9', '9:16'].includes(request.aspectRatio)
    ) {
      throw new Error('Unsupported Google video aspect ratio.');
    }
    if (request.generateAudio === false) {
      throw new Error('Google video audio cannot be disabled on this route.');
    }
  }

  private async resolveImage(reference: GatewayVideoReference) {
    const resolved = await resolveGatewayImageReference(reference, {
      mode: 'download-to-data-url',
      policy: {
        allowedMimeTypes: new Set(['image/png', 'image/jpeg', 'image/webp']),
        maxBytes: 15 * 1024 * 1024,
        timeoutMs: 30000,
        lookupHostname: this.lookupHostname,
        fetchWithTimeout: (url, init) => fetch(url, init),
      },
    });
    const parsed = parseDataUrlReference(resolved.url, resolved.mimeType);
    return { mimeType: parsed.mimeType, data: parsed.dataBase64 };
  }

  private mapVeoJob(
    operation: GoogleVideoOperation,
    model: string,
    prompt: string,
    context: ProviderExecutionContext,
  ): GatewayVideoGenerationJob {
    const uri =
      operation.response?.generateVideoResponse?.generatedSamples?.[0]?.video
        ?.uri;
    return {
      id: operation.name ?? context.requestId,
      requestId: context.requestId,
      providerId: 'google',
      model,
      prompt,
      status:
        operation.error || (operation.done && !uri)
          ? 'failed'
          : operation.done
            ? 'succeeded'
            : 'running',
      error: operation.error?.message,
      createdAt: new Date().toISOString(),
      outputs: uri ? [{ contentUrl: uri, mimeType: 'video/mp4' }] : [],
      providerMetadata: { operationName: operation.name ?? null },
    };
  }

  private async mapOmniJob(
    interaction: GoogleInteraction,
    prompt: string,
    context: ProviderExecutionContext,
  ): Promise<GatewayVideoGenerationJob> {
    const video = this.readOmniVideo(interaction);
    const file = video?.uri
      ? await this.readOmniFile(video.uri, context)
      : undefined;
    const status =
      interaction.error ||
      interaction.status === 'failed' ||
      (interaction.status === 'completed' && !video) ||
      file?.state === 'FAILED'
        ? 'failed'
        : video?.data || (video?.uri && file?.state === 'ACTIVE')
          ? 'succeeded'
          : 'running';
    return {
      id: `omni:${interaction.id ?? context.requestId}`,
      requestId: context.requestId,
      providerId: 'google',
      model: GOOGLE_OMNI_MODEL,
      prompt,
      status,
      error: interaction.error?.message ?? file?.error?.message,
      createdAt: new Date().toISOString(),
      outputs:
        video && status === 'succeeded'
          ? [
              {
                contentUrl: video.uri ?? `google-interaction:${interaction.id}`,
                mimeType: video.mime_type ?? 'video/mp4',
              },
            ]
          : [],
      providerMetadata: { interactionId: interaction.id ?? null },
    };
  }

  private readOmniVideo(interaction: GoogleInteraction) {
    return interaction.steps
      ?.filter((step) => step.type === 'model_output')
      .flatMap((step) => step.content ?? [])
      .find((content) => content.type === 'video');
  }

  private async readOmniFile(uri: string, context: ProviderExecutionContext) {
    const fileId = this.readOmniFileId(uri);
    if (!fileId) throw new Error('Google Omni returned an invalid file URI.');
    const response = await this.client.get(context, `files/${fileId}`);
    if (!response.ok)
      throw await buildProviderHttpError('Google Omni file', response);
    return (await response.json()) as {
      downloadUri?: string;
      state?: string;
      error?: { message?: string };
    };
  }

  private async resolveOmniDownloadUrl(
    uri: string,
    context: ProviderExecutionContext,
  ) {
    const file = await this.readOmniFile(uri, context);
    if (file.state !== 'ACTIVE') {
      throw new Error('Google Omni video file is not available for download.');
    }
    return (
      file.downloadUri ??
      this.client.fileDownloadUrl(context, this.readOmniFileId(uri)!)
    );
  }

  private readOmniFileId(uri: string) {
    return /(?:^|\/)files\/([A-Za-z0-9_-]+)(?::download|[/?#]|$)/.exec(
      uri,
    )?.[1];
  }
}
