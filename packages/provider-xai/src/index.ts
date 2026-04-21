import * as dns from 'node:dns/promises';

import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayGeneratedImage,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
  GatewayImageReference,
} from '@lxp/contracts';
import { resolveGatewayImageReference } from '@lxp/provider-sdk';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

const XAI_IMAGE_MODEL_METADATA: ReadonlyMap<string, string> = new Map([
  ['grok-imagine-image', 'Grok Imagine Image'],
  ['grok-imagine-image-pro', 'Grok Imagine Image Pro'],
] as const);
const XAI_IMAGE_RESPONSE_FORMATS = ['url', 'b64_json'] as const;
const XAI_IMAGE_RESOLUTIONS = [
  {
    value: '1k',
    label: '1k',
  },
  {
    value: '2k',
    label: '2k',
  },
] as const;
const XAI_IMAGE_ASPECT_RATIOS = [
  {
    value: 'auto',
    label: 'Auto',
    useCase: 'Model auto-selects the best ratio for the prompt.',
  },
  {
    value: '1:1',
    label: '1:1',
    useCase: 'Social media, thumbnails',
  },
  {
    value: '16:9',
    label: '16:9',
    useCase: 'Widescreen, mobile, stories',
  },
  {
    value: '9:16',
    label: '9:16',
    useCase: 'Widescreen, mobile, stories',
  },
  {
    value: '4:3',
    label: '4:3',
    useCase: 'Presentations, portraits',
  },
  {
    value: '3:4',
    label: '3:4',
    useCase: 'Presentations, portraits',
  },
  {
    value: '3:2',
    label: '3:2',
    useCase: 'Photography',
  },
  {
    value: '2:3',
    label: '2:3',
    useCase: 'Photography',
  },
  {
    value: '2:1',
    label: '2:1',
    useCase: 'Banners, headers',
  },
  {
    value: '1:2',
    label: '1:2',
    useCase: 'Banners, headers',
  },
  {
    value: '19.5:9',
    label: '19.5:9',
    useCase: 'Modern smartphone displays',
  },
  {
    value: '9:19.5',
    label: '9:19.5',
    useCase: 'Modern smartphone displays',
  },
  {
    value: '20:9',
    label: '20:9',
    useCase: 'Ultra-wide displays',
  },
  {
    value: '9:20',
    label: '9:20',
    useCase: 'Ultra-wide displays',
  },
] as const;

export class XaiProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
  } as const;

  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    baseUrl = process.env.XAI_BASE_URL ?? 'https://api.x.ai/v1',
    requestTimeoutMs = Number(process.env.XAI_REQUEST_TIMEOUT_MS ?? '90000'),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
  }

  readonly providerId: LlmProviderAdapter['providerId'] = 'xai';

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await fetch(`${this.resolveBaseUrl(context)}/models`, {
      headers: this.resolveHeaders(context),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
      }>;
    };

    const listedModels = (payload.data ?? []).map((model) => ({
      id: model.id,
      displayName: XAI_IMAGE_MODEL_METADATA.get(model.id) ?? model.id,
      capabilities: this.resolveModelCapabilities(model.id),
    }));
    const knownImageModels = Array.from(XAI_IMAGE_MODEL_METADATA.entries())
      .filter(
        ([modelId]) =>
          !listedModels.some((listedModel) => listedModel.id === modelId),
      )
      .map(([modelId, displayName]) => ({
        id: modelId,
        displayName,
        capabilities: this.resolveModelCapabilities(modelId),
      }));

    return [...listedModels, ...knownImageModels];
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    const models = await this.listModels(context);
    return {
      providerId: this.providerId,
      defaultModelId: 'grok-imagine-image',
      models: models
        .filter(
          (model) =>
            Boolean(model.capabilities) &&
            (model.capabilities?.supportsImageGeneration ||
              model.capabilities?.supportsImageEditing),
        )
        .map((model) => ({
          id: model.id,
          displayName: model.displayName,
          capabilities: model.capabilities as NonNullable<ProviderModel['capabilities']>,
        })),
    };
  }

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string | null;
        message?: {
          role?: 'assistant';
          content?: string;
          reasoning?: string;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
      [key: string]: unknown;
    };

    const message = payload.choices?.[0]?.message;

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: request.model ?? 'unknown-model',
      message: {
        role: message?.role ?? 'assistant',
        content: message?.content ?? '',
        reasoning: message?.reasoning,
      },
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
      },
    };
  }

  async chatStream(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const response = await this.dispatchChatRequest(request, context, true);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('xAI streaming response did not include a body.');
    }

    return response.body;
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const response = await this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/images/generations`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          n: request.n,
          aspect_ratio: request.aspectRatio,
          response_format: request.responseFormat,
          resolution: request.resolution,
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI image generation failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as XaiImageResponsePayload;
    return this.mapImageResponse(request.model, context, payload);
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    if (request.images.length === 0) {
      throw new Error('xAI image editing requires at least one reference image.');
    }

    const mappedImages = await Promise.all(
      request.images.map((image) => this.mapImageReference(image)),
    );

    const response = await this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/images/edits`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          prompt: request.prompt,
          n: request.n,
          aspect_ratio: request.aspectRatio,
          response_format: request.responseFormat,
          resolution: request.resolution,
          image: mappedImages.length === 1 ? mappedImages[0] : undefined,
          images: mappedImages.length > 1 ? mappedImages : undefined,
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `xAI image edit failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as XaiImageResponsePayload;
    return this.mapImageResponse(request.model, context, payload);
  }

  private dispatchChatRequest(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
    stream: boolean,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify({
          model: request.model,
          messages: request.messages,
          stream,
          user: context.userId,
        }),
      },
      stream ? null : this.requestTimeoutMs,
    );
  }

  private resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.baseUrl).replace(/\/$/, '');
  }

  private resolveHeaders(
    context: ProviderExecutionContext,
  ): Record<string, string> {
    const providerAccess = context.providerAccess ?? {};
    const headers = {
      ...providerAccess.headers,
    };

    if (providerAccess.apiKey && !headers.authorization) {
      headers.authorization = `Bearer ${providerAccess.apiKey}`;
    }

    return headers;
  }

  private mapImageResponse(
    requestedModel: string | undefined,
    context: ProviderExecutionContext,
    payload: XaiImageResponsePayload,
  ): GatewayImageGenerationResponse {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: payload.model ?? requestedModel ?? 'unknown-model',
      images: (payload.data ?? []).map((image) => this.mapGeneratedImage(image)),
      providerMetadata: {
        created: payload.created,
      },
    };
  }

  private mapGeneratedImage(image: XaiGeneratedImage): GatewayGeneratedImage {
    return {
      url: image.url,
      b64Json: image.b64_json,
      revisedPrompt: image.revised_prompt,
    };
  }

  private async mapImageReference(image: GatewayImageReference): Promise<{
    type: 'image_url';
    url: string;
  }> {
    const resolvedReference = await resolveGatewayImageReference(image, {
      mode: 'passthrough-url',
      lookupHostname: (hostname) => this.lookupHostname(hostname),
    });

    return {
      type: 'image_url',
      url: resolvedReference.url,
    };
  }

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
    timeoutMs: number | null,
  ): Promise<Response> {
    if (timeoutMs === null || timeoutMs <= 0) {
      return fetch(url, init);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(url, {
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error(`xAI request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private resolveModelCapabilities(modelId: string) {
    if (!this.isImageModel(modelId)) {
      return {
        supportsStreaming: true,
      };
    }

    return {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageAspectRatios: [...XAI_IMAGE_ASPECT_RATIOS],
      supportedImageResponseFormats: [...XAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...XAI_IMAGE_RESOLUTIONS],
      maxGeneratedImagesPerRequest: 4,
      maxReferenceImagesPerRequest: 5,
      imageDefaults: {
        aspectRatio: 'auto',
        responseFormat: 'url',
        resolution: '1k',
        imageCount: 1,
      } as const,
    };
  }

  private isImageModel(modelId: string) {
    return XAI_IMAGE_MODEL_METADATA.has(modelId);
  }

  protected lookupHostname(hostname: string) {
    return dns.lookup(hostname, { all: true });
  }
}

interface XaiGeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

interface XaiImageResponsePayload {
  created?: number;
  model?: string;
  data?: XaiGeneratedImage[];
}
