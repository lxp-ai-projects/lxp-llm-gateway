import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface NanoGptImageModelRecord {
  id: string;
  object?: string;
  created?: number;
  owned_by?: string;
  name?: string;
  description?: string;
  capabilities?: {
    image_generation?: boolean;
    image_to_image?: boolean;
    inpainting?: boolean;
  };
  supported_parameters?: {
    resolutions?: string[];
    max_images?: number;
    fixed_image_count?: number;
  };
  pricing?: {
    per_image?: Record<string, number>;
    currency?: string;
  };
  category?: string;
  tags?: string[];
}

export interface NanoGptImageModelListPayload {
  object?: string;
  data?: NanoGptImageModelRecord[];
  meta?: {
    count?: number;
    generated_at?: string;
  };
}

export interface NanoGptImageTransportRequest {
  body: Record<string, unknown>;
}

export class NanoGptImageApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  async listImageModels(
    context: ProviderExecutionContext,
    path: '/image-models' | '/subscription/v1/image-models' | '/paid/v1/image-models',
  ): Promise<NanoGptImageModelListPayload> {
    const response = await fetch(
      `${this.resolveCatalogBaseUrl(context, path)}${path}?detailed=true`,
      {
        headers: this.resolveHeaders(context),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `NanoGPT image model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    return response.json() as Promise<NanoGptImageModelListPayload>;
  }

  postGenerations(
    context: ProviderExecutionContext,
    request: NanoGptImageTransportRequest,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/images/generations`,
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

  private resolveBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.baseUrl).replace(/\/$/, '');
  }

  private resolveCatalogBaseUrl(
    context: ProviderExecutionContext,
    path: '/image-models' | '/subscription/v1/image-models' | '/paid/v1/image-models',
  ): string {
    const resolvedBaseUrl = this.resolveBaseUrl(context);

    if (path === '/image-models') {
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

    if (providerAccess.apiKey && !headers.authorization) {
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
