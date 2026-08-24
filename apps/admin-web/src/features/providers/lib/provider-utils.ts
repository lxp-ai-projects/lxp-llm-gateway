import type { ProviderCredentialSummary } from '../../../lib/api-client';

const alphabeticalCollator = new Intl.Collator(undefined, {
  sensitivity: 'base',
  numeric: true,
});

export function providerCatalogHasMixedPricing(providerId: string | null) {
  return providerId === 'openrouter' || providerId === 'ollama';
}

export function getProviderCredentialResponsibilityNote(
  providerId: string | null,
) {
  if (providerId === 'google') {
    return "Google Gemini support is validated. The free tier is subject to Google's rate limits. Usage is billed through your Google AI account. Protect this API key, do not share it, and only use keys your organization is authorized to spend with. LXP is not responsible for authorized or unauthorized charges made with this key.";
  }

  if (providerId === 'xai') {
    return 'xAI Grok support is certified. Usage is billed through your xAI account. Protect this API key, do not share it, and only use keys your organization is authorized to spend with. LXP is not responsible for authorized or unauthorized charges made with this key.';
  }

  if (providerId === 'openai') {
    return 'OpenAI support is certified. Usage is billed through your OpenAI account. Protect this API key, do not share it, and only use keys your organization is authorized to spend with. LXP is not responsible for authorized or unauthorized charges made with this key.';
  }

  if (providerId === 'anthropic') {
    return 'Anthropic Claude support is native to the gateway and certified for the current chat contract. Model catalog certification coverage is still being expanded, so verify pricing and defaults before sending prompts. Usage is billed through your Anthropic account. Protect this API key, do not share it, and only use keys your organization is authorized to spend with. LXP is not responsible for authorized or unauthorized charges made with this key.';
  }

  return null;
}

export function getProviderCatalogPricingNote(providerId: string | null) {
  if (!providerCatalogHasMixedPricing(providerId)) {
    if (providerId === 'anthropic') {
      return 'providerDefaultsForm.catalogNotes.anthropic';
    }

    if (providerId === 'google') {
      return 'providerDefaultsForm.catalogNotes.google';
    }

    if (providerId === 'openai') {
      return 'providerDefaultsForm.catalogNotes.openai';
    }

    if (providerId === 'groq') {
      return 'providerDefaultsForm.catalogNotes.groq';
    }

    if (providerId === 'xai') {
      return 'providerDefaultsForm.catalogNotes.xai';
    }

    return null;
  }

  if (providerId === 'ollama') {
    return 'providerDefaultsForm.catalogNotes.ollama';
  }

  return 'providerDefaultsForm.catalogNotes.openrouter';
}

export function getProviderModelLoadingNote(providerId: string | null) {
  if (providerId === 'xai') {
    return 'providerDefaultsForm.modelLoadingNotes.xai';
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

export function buildDefaultImageProviderOptions(
  credentials: ProviderCredentialSummary[],
  supportedProviders: Array<{ providerId: string; displayName: string }>,
  imageCatalogProviders: Array<{ providerId: string }>,
) {
  const imageProviderIds = new Set(
    imageCatalogProviders.map((provider) => provider.providerId),
  );

  return buildDefaultProviderOptions(credentials, supportedProviders).filter(
    (provider) => imageProviderIds.has(provider.value),
  );
}

export function buildDefaultModelOptions(
  models: Array<{ id: string; displayName: string }>,
) {
  const uniqueModels = new Map<string, { id: string; displayName: string }>();

  for (const model of models) {
    if (!uniqueModels.has(model.id)) {
      uniqueModels.set(model.id, model);
    }
  }

  return [...uniqueModels.values()]
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
  const requiresApiToken =
    input.providerId === 'google' ||
    input.providerId === 'xai' ||
    input.providerId === 'openai' ||
    input.providerId === 'anthropic' ||
    input.providerId === 'mistral' ||
    input.providerId === 'deepseek' ||
    input.providerId === 'moonshot' ||
    input.providerId === 'zai';

  if (requiresApiToken && !input.apiToken.trim()) {
    return `providerCredentialForm.validation.tokenRequired.${input.providerId}`;
  }

  if (input.providerId !== 'ollama' || !input.baseUrl.trim()) {
    return null;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(input.baseUrl.trim());
  } catch {
    return 'providerCredentialForm.validation.ollamaBaseUrl';
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (
    (hostname === 'ollama.com' || hostname === 'www.ollama.com') &&
    !input.apiToken.trim()
  ) {
    return 'providerCredentialForm.validation.ollamaCloudTokenRequired';
  }

  return null;
}
