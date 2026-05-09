import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export interface XAiVideoGenerationAcceptedPayload {
  request_id?: string;
}

export interface XAiVideoStatusPayload {
  request_id?: string;
  status?: string;
  model?: string;
  error?: string;
  video?: {
    url?: string;
    duration?: number;
    respect_moderation?: boolean;
  };
}

export class XAiVideoApiClient {
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
        `xAI model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };

    return (payload.data ?? []).map((model) => model.id);
  }

  submitGeneration(context: ProviderExecutionContext, body: unknown) {
    return this.postJson(context, '/videos/generations', body);
  }

  submitEdit(context: ProviderExecutionContext, body: unknown) {
    return this.postJson(context, '/videos/edits', body);
  }

  submitExtension(context: ProviderExecutionContext, body: unknown) {
    return this.postJson(context, '/videos/extensions', body);
  }

  getVideoJob(context: ProviderExecutionContext, jobId: string) {
    return this.fetchWithTimeout(
      `${this.resolveBaseUrl(context)}/videos/${encodeURIComponent(jobId)}`,
      {
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );
  }

  downloadVideoContent(context: ProviderExecutionContext, url: string) {
    return this.fetchWithTimeout(
      url,
      {
        method: 'GET',
        headers: this.resolveHeaders(context),
      },
      this.requestTimeoutMs,
    );
  }

  private postJson(
    context: ProviderExecutionContext,
    path: string,
    body: unknown,
  ) {
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
}
