import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface NanoGptVideoModelRecord {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  architecture?: {
    input_modalities?: string[];
    output_modalities?: string[];
  };
  capabilities?: {
    video_generation?: boolean;
    image_to_video?: boolean;
    text_to_video?: boolean;
    reference_to_video?: boolean;
    audio_generation?: boolean;
  };
  supported_parameters?: {
    durations?: Array<number | string>;
    aspect_ratios?: string[];
    resolutions?: string[];
    sizes?: string[];
    supported_modes?: string[];
    allowed_passthrough_parameters?: string[];
    max_reference_images?: number;
  };
  pricing?: Record<string, unknown>;
}

export interface NanoGptVideoModelListPayload {
  object?: string;
  data?: NanoGptVideoModelRecord[];
  meta?: {
    count?: number;
    generated_at?: string;
  };
}

export interface NanoGptVideoGenerationAcceptedPayload {
  runId?: string;
  id?: string;
  status?: string;
  model?: string;
  cost?: number;
  paymentSource?: string;
  remainingBalance?: number;
  prechargeLabel?: string;
}

export interface NanoGptVideoStatusPayload {
  requestId?: string;
  runId?: string;
  model?: string;
  status?: string;
  videoUrl?: string | null;
  error?: string | null;
  createdAt?: string | null;
  completedAt?: string | null;
  progress?: number | null;
  estimatedTimeRemaining?: number | null;
  data?: {
    status?: string;
    requestId?: string;
    details?: string;
    cost?: number;
    error?: string;
    userFriendlyError?: string;
    isNSFWError?: boolean;
    output?: {
      video?: {
        url?: string;
      };
      videos?: Array<{
        url?: string;
      }>;
    };
  };
}

export interface NanoGptVideoTransportRequest {
  body: Record<string, unknown>;
}

export class NanoGptVideoApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  async listVideoModels(
    context: ProviderExecutionContext,
    path: '/video-models' | '/subscription/v1/video-models' | '/paid/v1/video-models',
  ): Promise<NanoGptVideoModelListPayload> {
    const response = await fetch(
      `${this.resolveCatalogBaseUrl(context, path)}${path}?detailed=true`,
      {
        headers: this.resolveHeaders(context),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT video model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    return response.json() as Promise<NanoGptVideoModelListPayload>;
  }

  submitVideoGeneration(
    context: ProviderExecutionContext,
    request: NanoGptVideoTransportRequest,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveTransportBaseUrl(context)}/generate-video`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify(request.body),
      },
      this.requestTimeoutMs,
    );
  }

  getVideoStatus(
    context: ProviderExecutionContext,
    jobId: string,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveTransportBaseUrl(context)}/video/status?requestId=${encodeURIComponent(jobId)}`,
      {
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );
  }

  downloadVideoContent(
    context: ProviderExecutionContext,
    url: string,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );
  }

  private resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.baseUrl).replace(/\/$/, '');
  }

  private resolveTransportBaseUrl(context: ProviderExecutionContext): string {
    return this.resolveBaseUrl(context).replace(/\/v1$/, '');
  }

  private resolveCatalogBaseUrl(
    context: ProviderExecutionContext,
    path: '/video-models' | '/subscription/v1/video-models' | '/paid/v1/video-models',
  ): string {
    const resolvedBaseUrl = this.resolveBaseUrl(context);

    if (path === '/video-models') {
      return resolvedBaseUrl;
    }

    return resolvedBaseUrl.replace(/\/v1$/, '');
  }

  private resolveHeaders(
    context: ProviderExecutionContext,
  ): Record<string, string> {
    const providerAccess = context.providerAccess ?? {};
    const headers = {
      ...providerAccess.headers,
    };

    if (providerAccess.apiKey && !headers.authorization && !headers['x-api-key']) {
      headers.authorization = `Bearer ${providerAccess.apiKey}`;
    }

    return headers;
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
        throw new Error(`NanoGPT request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

