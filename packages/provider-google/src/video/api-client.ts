import type { ProviderExecutionContext } from '@lxp/provider-sdk';

export class GoogleVideoApiClient {
  constructor(
    private readonly nativeBaseUrl: string,
    private readonly requestTimeoutMs: number,
  ) {}

  post(context: ProviderExecutionContext, path: string, body: unknown) {
    return this.request(context, path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  get(context: ProviderExecutionContext, path: string) {
    return this.request(context, path, {});
  }

  fileDownloadUrl(context: ProviderExecutionContext, fileId: string) {
    return `${this.resolveBaseUrl(context)}/files/${fileId}:download?alt=media`;
  }

  async download(context: ProviderExecutionContext, rawUrl: string) {
    let url = new URL(rawUrl);
    for (let redirectCount = 0; redirectCount < 4; redirectCount += 1) {
      if (
        url.protocol !== 'https:' ||
        url.username ||
        url.password ||
        !this.isAllowedDownloadHost(url.hostname)
      ) {
        throw new Error('Google video output URL is not trusted.');
      }
      const response = await fetch(url, {
        headers:
          url.hostname === 'generativelanguage.googleapis.com'
            ? this.headers(context)
            : {},
        redirect: 'manual',
        signal: context.signal
          ? AbortSignal.any([
              context.signal,
              AbortSignal.timeout(this.requestTimeoutMs),
            ])
          : AbortSignal.timeout(this.requestTimeoutMs),
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (!location)
          throw new Error('Google video redirect has no location.');
        url = new URL(location, url);
        continue;
      }
      return response;
    }
    throw new Error('Google video output redirected too many times.');
  }

  private isAllowedDownloadHost(hostname: string) {
    return (
      hostname === 'generativelanguage.googleapis.com' ||
      hostname === 'storage.googleapis.com' ||
      hostname.endsWith('.googleusercontent.com')
    );
  }

  private request(
    context: ProviderExecutionContext,
    path: string,
    init: RequestInit,
  ) {
    if (!/^[A-Za-z0-9_./:-]+$/.test(path) || path.includes('..')) {
      throw new Error('Invalid Google video resource path.');
    }
    const baseUrl = this.resolveBaseUrl(context);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    return fetch(`${baseUrl}/${path}`, {
      ...init,
      headers: { ...init.headers, ...this.headers(context) },
      signal: context.signal
        ? AbortSignal.any([context.signal, controller.signal])
        : controller.signal,
    }).finally(() => clearTimeout(timeout));
  }

  private resolveBaseUrl(context: ProviderExecutionContext) {
    const override =
      context.providerAccess.headers?.['x-google-native-base-url'] ??
      context.providerAccess.headers?.['X-Google-Native-Base-Url'];
    const baseUrl = context.providerAccess.baseUrl ?? this.nativeBaseUrl;
    return (override ?? baseUrl).replace(/\/openai\/?$/, '').replace(/\/$/, '');
  }

  private headers(context: ProviderExecutionContext) {
    const headers = { ...context.providerAccess.headers };
    delete headers.authorization;
    delete headers.Authorization;
    delete headers['x-google-native-base-url'];
    delete headers['X-Google-Native-Base-Url'];
    if (context.providerAccess.apiKey && !headers['x-goog-api-key']) {
      headers['x-goog-api-key'] = context.providerAccess.apiKey;
    }
    return headers;
  }
}
