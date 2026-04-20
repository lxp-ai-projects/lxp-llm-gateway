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
import {
  buildProviderHttpError,
  formatGoogleGeminiRateLimitError,
  parseDataUrlReference,
  resolveGatewayImageReference,
} from '@lxp/provider-sdk';
import type {
  LlmProviderAdapter,
  ProviderExecutionContext,
  ProviderModel,
} from '@lxp/provider-sdk';

const GOOGLE_OPENAI_BASE_URL =
  process.env.GOOGLE_BASE_URL ??
  'https://generativelanguage.googleapis.com/v1beta/openai';
const GOOGLE_NATIVE_BASE_URL =
  process.env.GOOGLE_NATIVE_BASE_URL ??
  'https://generativelanguage.googleapis.com/v1beta';
const GOOGLE_MAX_INLINE_REFERENCE_BYTES = Number(
  process.env.GOOGLE_MAX_INLINE_REFERENCE_BYTES ?? String(15 * 1024 * 1024),
);
const GOOGLE_IMAGE_RESPONSE_FORMATS = ['b64_json'] as const;
const GOOGLE_SUPPORTED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const GOOGLE_IMAGE_ASPECT_RATIOS = [
  {
    value: '1:1',
    label: '1:1',
    useCase: 'Square assets and social posts',
  },
  {
    value: '2:3',
    label: '2:3',
    useCase: 'Portrait photography',
  },
  {
    value: '3:2',
    label: '3:2',
    useCase: 'Landscape photography',
  },
  {
    value: '3:4',
    label: '3:4',
    useCase: 'Portrait layouts',
  },
  {
    value: '4:3',
    label: '4:3',
    useCase: 'Presentations and illustrations',
  },
  {
    value: '4:5',
    label: '4:5',
    useCase: 'Tall social formats',
  },
  {
    value: '5:4',
    label: '5:4',
    useCase: 'Product and editorial crops',
  },
  {
    value: '9:16',
    label: '9:16',
    useCase: 'Stories and vertical mobile',
  },
  {
    value: '16:9',
    label: '16:9',
    useCase: 'Widescreen and banners',
  },
  {
    value: '21:9',
    label: '21:9',
    useCase: 'Ultra-wide hero visuals',
  },
] as const;

const GOOGLE_IMAGE_MODELS = {
  'gemini-2.5-flash-image': {
    displayName: 'Nano Banana',
    supportedImageResolutions: [{ value: '1K', label: '1K' }],
  },
  'gemini-3-pro-image-preview': {
    displayName: 'Nano Banana Pro',
    supportedImageResolutions: [
      { value: '1K', label: '1K' },
      { value: '2K', label: '2K' },
      { value: '4K', label: '4K' },
    ],
    maxReferenceImagesPerRequest: 14,
  },
  'gemini-3.1-flash-image-preview': {
    displayName: 'Nano Banana 2',
    supportedImageResolutions: [
      { value: '512', label: '512' },
      { value: '1K', label: '1K' },
      { value: '2K', label: '2K' },
      { value: '4K', label: '4K' },
    ],
  },
} as const satisfies Record<
  string,
  {
    displayName: string;
    supportedImageResolutions: Array<{ value: string; label: string }>;
    maxReferenceImagesPerRequest?: number;
  }
>;

type GoogleImageModelId = keyof typeof GOOGLE_IMAGE_MODELS;

export class GoogleProviderAdapter implements LlmProviderAdapter {
  readonly capabilities = {
    chat: true,
    modelCatalog: true,
    imageGeneration: true,
    imageEditing: true,
  } as const;

  private readonly baseUrl: string;
  private readonly nativeBaseUrl: string;
  private readonly requestTimeoutMs: number;

  constructor(
    baseUrl = GOOGLE_OPENAI_BASE_URL,
    requestTimeoutMs = Number(process.env.GOOGLE_REQUEST_TIMEOUT_MS ?? '90000'),
    nativeBaseUrl = GOOGLE_NATIVE_BASE_URL,
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.nativeBaseUrl = nativeBaseUrl.replace(/\/$/, '');
    this.requestTimeoutMs = requestTimeoutMs;
  }

  readonly providerId = 'google' as LlmProviderAdapter['providerId'];

  supportsStreaming(): boolean {
    return true;
  }

  async listModels(
    context: ProviderExecutionContext,
  ): Promise<ProviderModel[]> {
    const response = await fetch(`${this.resolveBaseUrl(context)}/models`, {
      headers: this.resolveOpenAiHeaders(context),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Gemini model listing failed with status ${response.status}: ${errorText}`,
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
    const knownImageModels = Object.entries(GOOGLE_IMAGE_MODELS)
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

  async chat(
    request: GatewayChatRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayChatResponse> {
    const response = await this.dispatchChatRequest(request, context, false);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Gemini request failed with status ${response.status}: ${errorText}`,
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
        `Google Gemini streaming request failed with status ${response.status}: ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error(
        'Google Gemini streaming response did not include a body.',
      );
    }

    return response.body;
  }

  async generateImage(
    request: GatewayImageGenerationRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    return this.generateNativeImage(
      {
        model: request.model,
        prompt: request.prompt,
        images: [],
        n: request.n,
        aspectRatio: request.aspectRatio,
        responseFormat: request.responseFormat,
        resolution: request.resolution,
      },
      context,
    );
  }

  async editImage(
    request: GatewayImageEditRequest,
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    if (request.images.length === 0) {
      throw new Error(
        'Google Gemini image editing requires at least one reference image.',
      );
    }

    return this.generateNativeImage(
      {
        model: request.model,
        prompt: request.prompt,
        images: request.images,
        n: request.n,
        aspectRatio: request.aspectRatio,
        responseFormat: request.responseFormat,
        resolution: request.resolution,
      },
      context,
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
          ...this.resolveOpenAiHeaders(context),
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

  private async generateNativeImage(
    request: {
      model: string | undefined;
      prompt: string;
      images: GatewayImageReference[];
      n?: number;
      aspectRatio?: string;
      responseFormat?: GatewayImageGenerationRequest['responseFormat'];
      resolution?: string;
    },
    context: ProviderExecutionContext,
  ): Promise<GatewayImageGenerationResponse> {
    const model = request.model ?? 'gemini-2.5-flash-image';
    const imageModelMetadata = GOOGLE_IMAGE_MODELS[model as GoogleImageModelId];

    if (!imageModelMetadata) {
      throw new Error(`Google image model ${model} is not supported.`);
    }

    if (request.responseFormat && request.responseFormat !== 'b64_json') {
      throw new Error(
        'Google Gemini image generation currently returns inline image bytes only. Use responseFormat "b64_json".',
      );
    }

    const response = await this.fetchWithTimeout(
      `${this.resolveNativeBaseUrl(context)}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveNativeHeaders(context),
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [
                { text: request.prompt },
                ...(await Promise.all(
                  request.images.map((image) =>
                    this.mapImageReference(image, context),
                  ),
                )),
              ],
            },
          ],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            candidateCount: request.n,
            imageConfig: {
              aspectRatio: request.aspectRatio,
              imageSize: request.resolution,
            },
          },
        }),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      throw await buildProviderHttpError('Google Gemini image request', response, {
        rateLimitFormatter: formatGoogleGeminiRateLimitError,
      });
    }

    const payload = (await response.json()) as GoogleGenerateContentResponse;
    return this.mapGenerateContentResponse(model, context, payload);
  }

  private resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.baseUrl).replace(/\/$/, '');
  }

  private resolveNativeBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    const configuredBaseUrl =
      providerAccess.headers?.['x-google-native-base-url'] ??
      providerAccess.headers?.['X-Google-Native-Base-Url'];

    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    const resolvedBaseUrl = this.resolveBaseUrl(context);
    if (resolvedBaseUrl.endsWith('/openai')) {
      return resolvedBaseUrl.slice(0, -'/openai'.length);
    }

    return this.nativeBaseUrl;
  }

  private resolveOpenAiHeaders(
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

  private resolveNativeHeaders(
    context: ProviderExecutionContext,
  ): Record<string, string> {
    const providerAccess = context.providerAccess ?? {};
    const headers = {
      ...providerAccess.headers,
    };

    delete headers.authorization;

    if (providerAccess.apiKey && !headers['x-goog-api-key']) {
      headers['x-goog-api-key'] = providerAccess.apiKey;
    }

    delete headers['x-google-native-base-url'];
    delete headers['X-Google-Native-Base-Url'];

    return headers;
  }

  private mapGenerateContentResponse(
    requestedModel: string,
    context: ProviderExecutionContext,
    payload: GoogleGenerateContentResponse,
  ): GatewayImageGenerationResponse {
    const images: GatewayGeneratedImage[] = [];
    const textOutputs: string[] = [];

    for (const candidate of payload.candidates ?? []) {
      for (const part of candidate.content?.parts ?? []) {
        if (part.inlineData?.data) {
          images.push({
            b64Json: part.inlineData.data,
            mimeType: part.inlineData.mimeType,
          });
          continue;
        }

        if (part.text) {
          textOutputs.push(part.text);
        }
      }
    }

    if (!images.length) {
      throw new Error(
        payload.promptFeedback?.blockReason
          ? `Google Gemini image request was blocked: ${payload.promptFeedback.blockReason}.`
          : 'Google Gemini did not return any image data.',
      );
    }

    return {
      requestId: context.requestId,
      providerId: this.providerId,
      model: requestedModel,
      images,
      providerMetadata: {
        modelVersion: payload.modelVersion,
        responseId: payload.responseId,
        promptFeedback: payload.promptFeedback,
        textOutputs,
        usageMetadata: payload.usageMetadata,
      },
    };
  }

  private async mapImageReference(
    image: GatewayImageReference,
    context: ProviderExecutionContext,
  ) {
    const resolvedReference = await resolveGatewayImageReference(image, {
      mode: 'download-to-data-url',
      policy: {
        allowedMimeTypes: GOOGLE_SUPPORTED_IMAGE_MIME_TYPES,
        fetchWithTimeout: (url, init, timeoutMs) =>
          this.fetchWithTimeout(url, init, timeoutMs),
        lookupHostname: (hostname) => this.lookupHostname(hostname),
        maxBytes: GOOGLE_MAX_INLINE_REFERENCE_BYTES,
        timeoutMs: this.requestTimeoutMs,
      },
    });
    const parsedDataUrl = parseDataUrlReference(
      resolvedReference.url,
      resolvedReference.mimeType,
    );

    return {
      inline_data: {
        mime_type: parsedDataUrl.mimeType,
        data: parsedDataUrl.dataBase64,
      },
    };
  }

  protected lookupHostname(hostname: string) {
    return dns.lookup(hostname, { all: true });
  }

  private resolveModelDisplayName(modelId: string) {
    return GOOGLE_IMAGE_MODELS[modelId as GoogleImageModelId]?.displayName ?? modelId;
  }

  private resolveModelCapabilities(modelId: string) {
    const imageModelMetadata = GOOGLE_IMAGE_MODELS[modelId as GoogleImageModelId];

    if (!imageModelMetadata) {
      return {
        supportsStreaming: true,
      };
    }

    return {
      supportsStreaming: false,
      supportsImageGeneration: true,
      supportsImageEditing: true,
      supportedImageAspectRatios: [...GOOGLE_IMAGE_ASPECT_RATIOS],
      supportedImageResponseFormats: [...GOOGLE_IMAGE_RESPONSE_FORMATS],
      supportedImageResolutions: [
        ...imageModelMetadata.supportedImageResolutions,
      ],
      ...(('maxReferenceImagesPerRequest' in imageModelMetadata &&
        typeof imageModelMetadata.maxReferenceImagesPerRequest === 'number')
        ? {
            maxReferenceImagesPerRequest:
              imageModelMetadata.maxReferenceImagesPerRequest,
          }
        : {}),
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
        throw new Error(
          `Google Gemini request timed out after ${timeoutMs} ms.`,
        );
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

interface GoogleGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
      }>;
    };
  }>;
  modelVersion?: string;
  promptFeedback?: {
    blockReason?: string;
    [key: string]: unknown;
  };
  responseId?: string;
  usageMetadata?: Record<string, unknown>;
}
