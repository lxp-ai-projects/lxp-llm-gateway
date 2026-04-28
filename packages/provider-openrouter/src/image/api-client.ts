import type { ProviderExecutionContext } from '@lxp/provider-sdk';

import type { OpenRouterImageModelRecord } from './catalog.js';

export class OpenRouterImageApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  async listImageModels(
    context: ProviderExecutionContext,
  ): Promise<OpenRouterImageModelRecord[]> {
    const response = await this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/models?output_modalities=image`,
      {
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter image catalog lookup failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: OpenRouterImageModelRecord[];
    };

    return payload.data ?? [];
  }

  postGenerations(
    context: ProviderExecutionContext,
    request: Record<string, unknown>,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveHeaders(context),
        },
        body: JSON.stringify(request),
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
        throw new Error(`OpenRouter request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
