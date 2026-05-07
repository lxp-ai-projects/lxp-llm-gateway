import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export class ZaiImageApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  async listModelIds(context: ProviderExecutionContext): Promise<string[]> {
    const response = await this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/models`,
      {
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Z.ai model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };

    return (payload.data ?? []).map((model) => model.id);
  }

  postGenerations(
    context: ProviderExecutionContext,
    body: unknown,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/images/generations`,
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
    const hasAuthorizationHeader = Object.keys(headers).some(
      (headerName) => headerName.toLowerCase() === 'authorization',
    );

    if (providerAccess.apiKey && !hasAuthorizationHeader) {
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
        throw new Error(`Z.ai request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
