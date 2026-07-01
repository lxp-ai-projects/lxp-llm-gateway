import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';
import type { ProviderAccessConfig } from '@lxp/provider-sdk';

const CATALOG_SAFE_HOSTS: Record<ProviderId, string[]> = {
  anthropic: ['api.anthropic.com'],
  deepseek: ['api.deepseek.com'],
  google: ['generativelanguage.googleapis.com'],
  groq: ['api.groq.com'],
  mistral: ['api.mistral.ai'],
  moonshot: ['api.moonshot.ai'],
  nanogpt: ['nano-gpt.com', 'www.nano-gpt.com'],
  ollama: ['localhost', '127.0.0.1', '::1', '[::1]'],
  openai: ['api.openai.com'],
  openrouter: ['openrouter.ai'],
  xai: ['api.x.ai'],
  zai: ['api.z.ai'],
};

export function assertProviderAccessIsValid(
  providerId: string | undefined,
  providerAccess: ProviderAccessConfig,
): void {
  if (
    (providerId === 'google' ||
      providerId === 'xai' ||
      providerId === 'openai' ||
      providerId === 'anthropic' ||
      providerId === 'mistral' ||
      providerId === 'deepseek') &&
    !providerAccess.apiKey
  ) {
    throw new BadRequestException(
      providerId === 'google'
        ? 'Google Gemini credentials require an API token.'
        : providerId === 'xai'
          ? 'xAI Grok credentials require an API token.'
          : providerId === 'openai'
            ? 'OpenAI credentials require an API token.'
            : providerId === 'anthropic'
              ? 'Anthropic credentials require an API token.'
              : providerId === 'mistral'
                ? 'Mistral credentials require an API token.'
                : 'DeepSeek credentials require an API token.',
    );
  }

  if (providerId !== 'ollama' || !providerAccess.baseUrl) {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(providerAccess.baseUrl);
  } catch {
    throw new BadRequestException(
      'Ollama base URL must be a valid absolute URL.',
    );
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    (hostname === 'ollama.com' || hostname === 'www.ollama.com') &&
    !providerAccess.apiKey
  ) {
    throw new BadRequestException(
      'Ollama cloud credentials on ollama.com require an API token.',
    );
  }
}

export function assertCatalogProviderBaseUrlIsSafe(
  providerId: ProviderId,
  providerAccess: ProviderAccessConfig,
): void {
  const baseUrl = providerAccess.baseUrl?.trim();
  if (!baseUrl) {
    return;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new BadRequestException(
      'Provider base URL must be a valid absolute URL.',
    );
  }

  const protocol = parsedUrl.protocol.toLowerCase();
  const hostname = parsedUrl.hostname.toLowerCase();
  const isLoopbackOllamaHost =
    providerId === 'ollama' &&
    (hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '[::1]');

  if (protocol !== 'https:' && !(protocol === 'http:' && isLoopbackOllamaHost)) {
    throw new BadRequestException(
      providerId === 'ollama'
        ? 'Catalog lookups require HTTPS except for loopback Ollama endpoints.'
        : 'Catalog lookups require an HTTPS provider base URL.',
    );
  }

  const allowedHosts = CATALOG_SAFE_HOSTS[providerId];
  if (!allowedHosts?.length) {
    throw new ForbiddenException(
      `Model catalog lookups are not allowed for custom ${providerId} base URLs from admin-api.`,
    );
  }

  if (!allowedHosts.includes(hostname)) {
    throw new ForbiddenException(
      `Model catalog lookups are not allowed for the configured ${providerId} base URL from admin-api.`,
    );
  }
}

export function getValidatedPlatformProviderAccess(
  providerId: ProviderId,
  providerAccess: ProviderAccessConfig | null,
): ProviderAccessConfig | null {
  if (!providerAccess) {
    return null;
  }

  assertProviderAccessIsValid(providerId, providerAccess);
  return providerAccess;
}
