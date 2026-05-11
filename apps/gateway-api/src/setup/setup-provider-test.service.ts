import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ProviderId } from '@lxp/domain';

import { ProviderRegistryService } from '../gateway/provider-registry.service';
import { SetupProviderTestRequestDto } from './dto/setup-provider-test-request.dto';

export interface SetupProviderTestResult {
  success: boolean;
  providerId: ProviderId;
  modelTested: string | null;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class SetupProviderTestService {
  constructor(
    private readonly providerRegistryService: ProviderRegistryService,
  ) {}

  async testProvider(
    request: SetupProviderTestRequestDto,
  ): Promise<SetupProviderTestResult> {
    const provider = this.providerRegistryService.getProvider(request.providerId);

    if (!provider.capabilities.modelCatalog || !provider.listModels) {
      return {
        success: false,
        providerId: request.providerId,
        modelTested: null,
        errorCode: 'provider_test_unsupported',
        errorMessage:
          'Provider setup testing is not supported for this provider.',
      };
    }

    try {
      const models = await provider.listModels({
        requestId: randomUUID(),
        userId: 'setup-provider-test',
        providerAccess: {
          apiKey: request.apiKey?.trim() || undefined,
          baseUrl: request.baseUrl?.trim() || undefined,
        },
      });

      return {
        success: true,
        providerId: request.providerId,
        modelTested: models[0]?.id ?? null,
      };
    } catch (error) {
      return {
        success: false,
        providerId: request.providerId,
        modelTested: null,
        errorCode: 'provider_test_failed',
        errorMessage: sanitizeProviderTestError(error),
      };
    }
  }
}

function sanitizeProviderTestError(error: unknown): string {
  const message =
    error instanceof Error ? error.message : 'Provider test failed.';

  return message
    .replace(/Bearer\s+[A-Za-z0-9._\-+/=]+/gi, 'Bearer [redacted]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}
