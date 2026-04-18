import type { ProviderCredentialSummary } from '../../../lib/api-client';

export function providerCatalogHasMixedPricing(providerId: string | null) {
  return providerId === 'openrouter' || providerId === 'ollama';
}

export function getProviderCatalogPricingNote(providerId: string | null) {
  if (!providerCatalogHasMixedPricing(providerId)) {
    return null;
  }

  if (providerId === 'ollama') {
    return 'Ollama catalogs can mix local/self-hosted models with paid or remotely hosted ones depending on the endpoint you configured. Verify the model source before using it as a default.';
  }

  return 'OpenRouter catalogs can include both free and paid models. Verify pricing and rate limits before choosing a default model or sending prompts.';
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
  return supportedProviders.map((provider) => ({
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
    .map((provider) => ({
      value: provider.providerId,
      label: provider.displayName,
    }));
}

export function buildDefaultModelOptions(
  models: Array<{ id: string; displayName: string }>,
) {
  return models.map((modelEntry) => ({
    value: modelEntry.id,
    label: modelEntry.displayName,
  }));
}
