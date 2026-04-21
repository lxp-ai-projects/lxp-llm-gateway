import type {
  GatewayChatRequest,
  GatewayChatResponse,
  GatewayGeneratedImage,
  GatewayImageEditRequest,
  GatewayImageGenerationRequest,
  GatewayImageGenerationResponse,
} from '@lxp/contracts';
import {
  buildProviderHttpError,
  formatOpenAiRateLimitError,
} from '@lxp/provider-sdk';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

const OPENAI_IMAGE_MODELS = {
  'gpt-image-1.5': {
    displayName: 'GPT Image 1.5',
  },
  'gpt-image-1': {
    displayName: 'GPT Image 1',
  },
  'gpt-image-1-mini': {
    displayName: 'GPT Image 1 Mini',
  },
} as const;
const OPENAI_IMAGE_RESPONSE_FORMATS = ['b64_json'] as const;
const OPENAI_IMAGE_RESOLUTIONS = [
  { value: 'auto', label: 'Auto' },
  { value: '1024x1024', label: '1024x1024' },
  { value: '1536x1024', label: '1536x1024' },
  { value: '1024x1536', label: '1024x1536' },
] as const;
const OPENAI_IMAGE_OUTPUT_FORMATS = [
  { value: 'png', label: 'PNG' },
  { value: 'jpeg', label: 'JPEG' },
  { value: 'webp', label: 'WebP' },
] as const;
const OPENAI_IMAGE_BACKGROUNDS = [
  { value: 'auto', label: 'Auto' },
  { value: 'opaque', label: 'Opaque' },
  { value: 'transparent', label: 'Transparent' },
] as const;
const OPENAI_IMAGE_QUALITIES = [
  { value: 'auto', label: 'Auto' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;
const OPENAI_IMAGE_INPUT_FIDELITIES = [
  {
    value: 'low',
    label: 'Low',
    description: 'Looser adherence to the reference image.',
  },
  {
    value: 'high',
    label: 'High',
    description: 'Preserve source details more strictly.',
  },
] as const;
type OpenAiImageModelId = keyof typeof OPENAI_IMAGE_MODELS;

export class OpenAiProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: false,
  } as const;

  private readonly baseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    baseUrl = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    requestTimeoutMs = Number(process.env.OPENAI_REQUEST_TIMEOUT_MS ?? '90000'),
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
  }

  readonly providerId = 'openai' as LlmProviderAdapter['providerId'];

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
        `OpenAI model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{
        id: string;
      }>;
    };

    const listedModels = (payload.data ?? []).map((model) => ({
      id: model.id,
      displayName: this.resolveModelDisplayName(model.id),
      capabilities: this.resolveModelCapabilities(model.id),
    }));
    const knownImageModels = Object.entries(OPENAI_IMAGE_MODELS)
      .filter(
        ([modelId]) =>
          !listedModels.some((listedModel) => listedModel.id === modelId),
      )
      .map(([modelId, metadata]) => ({
        id: modelId,
        displayName: metadata.displayName,
        capabilities: this.resolveModelCapabilities(modelId),
      }));

    return [...listedModels, ...knownImageModels];
  }

  async listImageCatalog(context: ProviderExecutionContext) {
    const models = await this.listModels(context);
    return {
      providerId: this.providerId,
      defaultModelId: 'gpt-image-1.5',
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
        `OpenAI request failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        finish_reason?: string | null;
        message?: {
          role?: 'assistant';
          content?: string;
          reasoning?: string;
          reasoning_details?: unknown;
        };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
        completion_tokens_details?: {
          reasoning_tokens?: number;
        };
      };
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
        reasoningDetails: message?.reasoning_details,
      },
      finishReason: payload.choices?.[0]?.finish_reason ?? null,
      usage: {
        promptTokens: payload.usage?.prompt_tokens,
        completionTokens: payload.usage?.completion_tokens,
        totalTokens: payload.usage?.total_tokens,
        reasoningTokens:
          payload.usage?.completion_tokens_details?.reasoning_tokens,
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
        `OpenAI streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error('OpenAI streaming response did not include a body.');
    }

    return response.body;
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gpt-image-1.5';
    this.assertSupportedImageModel(model);

    const response = await this.postJson(
      context,
      '/images/generations',
      this.buildImageGenerationBody(request, context, model),
    );

    if (!response.ok) {
      throw await buildProviderHttpError('OpenAI image request', response, {
        rateLimitFormatter: formatOpenAiRateLimitError,
      });
    }

    const payload = (await response.json()) as OpenAiImageResponsePayload;
    return this.mapImageResponse(model, context, payload);
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gpt-image-1.5';
    this.assertSupportedImageModel(model);
    void context;

    throw new Error(
      'OpenAI GPT Image editing is temporarily unavailable in the gateway because the upstream OpenAI Images API currently rejects GPT Image models on the image edits endpoint.',
    );
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

  private buildImageGenerationBody(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
    model: string,
  ) {
    return {
      model,
      prompt: request.prompt,
      n: request.n,
      size: request.resolution,
      background: request.background,
      quality: request.quality,
      output_format: request.outputFormat,
      output_compression: request.outputCompression,
      user: context.userId,
    };
  }

  private postJson(
    context: ProviderExecutionContext,
    path: string,
    body: unknown,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}${path}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify(body),
      },
      this.requestTimeoutMs,
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

  private resolveModelDisplayName(modelId: string) {
    return OPENAI_IMAGE_MODELS[modelId as OpenAiImageModelId]?.displayName ?? modelId;
  }

  private resolveModelCapabilities(modelId: string) {
    if (!(modelId in OPENAI_IMAGE_MODELS)) {
      return {
        supportsStreaming: true,
      };
    }

    return {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: false,
      supportedImageResponseFormats: [...OPENAI_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [...OPENAI_IMAGE_RESOLUTIONS],
      supportedImageOutputFormats: [...OPENAI_IMAGE_OUTPUT_FORMATS],
      supportedImageBackgrounds: [...OPENAI_IMAGE_BACKGROUNDS],
      supportedImageQualities: [...OPENAI_IMAGE_QUALITIES],
      supportedImageInputFidelities: [...OPENAI_IMAGE_INPUT_FIDELITIES],
      imageOutputCompressionRange: {
        min: 0,
        max: 100,
        defaultValue: 100,
        step: 1,
      },
      maxGeneratedImagesPerRequest: 10,
      imageDefaults: {
        responseFormat: 'b64_json',
        resolution: '1024x1024',
        background: 'auto',
        quality: 'auto',
        outputFormat: 'png',
        outputCompression: 100,
        imageCount: 1,
      } as const,
    };
  }

  private assertSupportedImageModel(modelId: string) {
    if (!(modelId in OPENAI_IMAGE_MODELS)) {
      throw new Error(`OpenAI image model ${modelId} is not supported.`);
    }
  }

  private mapImageResponse(
    requestedModel: string,
    context: ProviderExecutionContext,
    payload: OpenAiImageResponsePayload,
  ): GatewayImageGenerationResponse {
    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: requestedModel,
      images: (payload.data ?? []).map((image) => this.mapGeneratedImage(image)),
      providerMetadata: {
        created: payload.created,
      },
    };
  }

  private mapGeneratedImage(image: OpenAiGeneratedImage): GatewayGeneratedImage {
    return {
      url: image.url,
      b64Json: image.b64_json,
      revisedPrompt: image.revised_prompt,
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
        throw new Error(`OpenAI request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

interface OpenAiGeneratedImage {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
}

interface OpenAiImageResponsePayload {
  created?: number;
  data?: OpenAiGeneratedImage[];
}
