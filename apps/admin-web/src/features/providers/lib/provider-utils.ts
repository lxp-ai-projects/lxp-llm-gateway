import type { ProviderCredentialSummary } from '../../../lib/api-client';

const alphabeticalCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

export function providerCatalogHasMixedPricing(providerId: string | null) {
  return providerId === 'openrouter' || providerId === 'ollama';
}

export function getProviderCatalogPricingNote(providerId: string | null) {
  if (!providerCatalogHasMixedPricing(providerId)) {
    if (providerId === 'anthropic') {
      return 'Anthropic support is experimental and requires additional certification tests before it can be considered stable. Usage is billed through your Anthropic account. Protect the API key, do not share it, and verify model pricing before choosing defaults or sending prompts. LXP is not responsible for authorized or unauthorized charges made with this key.';
    }

    if (providerId === 'openai') {
      return 'OpenAI support is experimental and requires additional certification tests before it can be considered stable. Usage is billed through your OpenAI account. Protect the API key, do not share it, and verify model pricing before choosing defaults or sending prompts. LXP is not responsible for authorized or unauthorized charges made with this key.';
    }

    if (providerId === 'groq') {
      return "Groq is Groq's inference platform, not Grok from xAI. Verify the provider before selecting models or credentials.";
    }

    if (providerId === 'xai') {
      return 'xAI Grok support is experimental and requires additional certification tests before it can be considered stable. Usage is billed through your xAI account. Protect the API key, do not share it, and verify costs before sending prompts. LXP is not responsible for authorized or unauthorized charges made with that key.';
    }

    return null;
  }

  if (providerId === 'ollama') {
    return 'Ollama catalogs can mix local/self-hosted models with paid or remotely hosted ones depending on the endpoint you configured. Verify the model source before using it as a default.';
  }

  return 'OpenRouter catalogs can include both free and paid models. Verify pricing and rate limits before choosing a default model or sending prompts.';
}

export function getProviderModelLoadingNote(providerId: string | null) {
  if (providerId === 'xai') {
    return "xAI's models endpoint returns the models available to the authenticating API key. The docs do not describe a credit requirement for model listing. If loading fails, check the API key, team access, or xAI service status.";
  }

  return null;
}

export function resolveProviderDisplayName(
  supportedProviders: Array<{ providerId: string; displayName: string }>,
  providerIdToResolve: string,
): string {
  return (
    supportedProviders.find(
      (provider) => provider.providerId === providerIdToResolve,
    )?.displayName ?? providerIdToResolve
  );
}

export function buildProviderOptions(
  supportedProviders: Array<{ providerId: string; displayName: string }>,
) {
  return [...supportedProviders]
    .sort((left, right) =>
      alphabeticalCollator.compare(left.displayName, right.displayName),
    )
    .map((provider) => ({
      value: provider.providerId,
      label: provider.displayName,
    }));
}

export function buildDefaultProviderOptions(
  credentials: ProviderCredentialSummary[],
  supportedProviders: Array<{ providerId: string; displayName: string }>,
) {
  const activeProviderIds = new Set(
    credentials
      .filter((credential) => credential.isActive)
      .map((credential) => credential.providerId),
  );

  return supportedProviders
    .filter((provider) => activeProviderIds.has(provider.providerId))
    .sort((left, right) =>
      alphabeticalCollator.compare(left.displayName, right.displayName),
    )
    .map((provider) => ({
      value: provider.providerId,
      label: provider.displayName,
    }));
}

export function buildDefaultModelOptions(
  models: Array<{ id: string; displayName: string }>,
) {
  return [...models]
    .sort((left, right) =>
      alphabeticalCollator.compare(left.displayName, right.displayName),
    )
    .map((modelEntry) => ({
      value: modelEntry.id,
      label: modelEntry.displayName,
    }));
}

export function validateProviderCredentialInput(input: {
  providerId: string;
  apiToken: string;
  baseUrl: string;
}): string | null {
  if (
    (input.providerId === 'xai' ||
      input.providerId === 'openai' ||
      input.providerId === 'anthropic') &&
    !input.apiToken.trim()
  ) {
    return input.providerId === 'xai'
      ? 'xAI Grok credentials require an API token.'
      : input.providerId === 'openai'
        ? 'OpenAI credentials require an API token.'
        : 'Anthropic credentials require an API token.';
  }

  if (input.providerId !== 'ollama' || !input.baseUrl.trim()) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.baseUrl.trim());
  } catch {
    return 'Ollama base URL must be a valid absolute URL.';
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    (hostname === 'ollama.com' || hostname === 'www.ollama.com') &&
    !input.apiToken.trim()
  ) {
    return 'Ollama cloud credentials on ollama.com require an API token.';
  }

  return null;
}
