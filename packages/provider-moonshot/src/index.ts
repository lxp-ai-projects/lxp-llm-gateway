import {
  OpenAiCompatibleTextProviderAdapter,
} from '@lxp/provider-sdk';

export class MoonshotProviderAdapter extends OpenAiCompatibleTextProviderAdapter {
  constructor(
    baseUrl = process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1',
    requestTimeoutMs = resolveMoonshotRequestTimeoutMs(
      process.env.MOONSHOT_REQUEST_TIMEOUT_MS,
    ),
  ) {
    super({
      providerId: 'moonshot',
      displayName: 'Moonshot',
      defaultBaseUrl: baseUrl,
      requestTimeoutMs,
    });
  }
}

function resolveMoonshotRequestTimeoutMs(
  rawTimeoutMs: string | undefined,
): number {
  const parsedTimeoutMs = Number(rawTimeoutMs ?? '90000');

  if (!Number.isFinite(parsedTimeoutMs) || Number.isNaN(parsedTimeoutMs) || parsedTimeoutMs <= 0) {
    return 90000;
  }

  return parsedTimeoutMs;
}
