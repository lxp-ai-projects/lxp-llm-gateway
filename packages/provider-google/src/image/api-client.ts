import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export class GoogleImageApiClient {
  constructor(
    private readonly openAiBaseUrl: string,
    private readonly nativeBaseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  async listModelIds(context: ProviderExecutionContext): Promise<string[]> {
    const response = await fetch(`${this.resolveOpenAiBaseUrl(context)}/models`, {
      headers: this.resolveOpenAiHeaders(context),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Google Gemini model listing failed with status ${response.status}: ${errorText}`,
      );
    }

    const payload = (await response.json()) as {
      data?: Array<{ id: string }>;
    };

    return (payload.data ?? []).map((model) => model.id);
  }

  postGenerateContent(
    context: ProviderExecutionContext,
    model: string,
    body: unknown,
  ): Promise<Response> {
    return this.fetchWithTimeout(
      `${this.resolveNativeBaseUrl(context)}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...this.resolveNativeHeaders(context),
        },
        body: JSON.stringify(body),
      },
      this.requestTimeoutMs,
    );
  }

  fetchReference(
    url: string,
    init: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    return this.fetchWithTimeout(url, init, timeoutMs);
  }

  private resolveOpenAiBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    return (providerAccess.baseUrl ?? this.openAiBaseUrl).replace(/\/$/, '');
  }

  private resolveNativeBaseUrl(context: ProviderExecutionContext): string {
    const providerAccess = context.providerAccess ?? {};
    const configuredBaseUrl =
      providerAccess.headers?.['x-google-native-base-url'] ??
      providerAccess.headers?.['X-Google-Native-Base-Url'];

    if (configuredBaseUrl) {
      return configuredBaseUrl.replace(/\/$/, '');
    }

    const resolvedBaseUrl = this.resolveOpenAiBaseUrl(context);
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
        throw new Error(`Google Gemini request timed out after ${timeoutMs} ms.`);
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
