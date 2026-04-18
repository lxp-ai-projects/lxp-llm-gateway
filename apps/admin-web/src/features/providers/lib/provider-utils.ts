import type { ProviderCredentialSummary } from '../../../lib/api-client';

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
