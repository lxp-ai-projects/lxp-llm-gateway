import {
  OpenAiCompatibleTextProviderAdapter,
} from '@lxp/provider-sdk';

export class MoonshotProviderAdapter extends OpenAiCompatibleTextProviderAdapter {
  constructor(
    baseUrl = process.env.MOONSHOT_BASE_URL ?? 'https://api.moonshot.ai/v1',
    requestTimeoutMs = Number(
      process.env.MOONSHOT_REQUEST_TIMEOUT_MS ?? '90000',
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
