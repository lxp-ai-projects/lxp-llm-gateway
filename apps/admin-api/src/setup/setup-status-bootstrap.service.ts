import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';

import { SetupStatusService } from './setup-status.service';

@Injectable()
export class SetupStatusBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SetupStatusBootstrapService.name);

  constructor(private readonly setupStatusService: SetupStatusService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.setupStatusService.ensureInstallationState();
    } catch (error) {
      if (isMissingRelationError(error)) {
        this.logger.warn(
          'Skipping setup state bootstrap because the installation_state table is not ready yet.',
        );
        return;
      }

      throw error;
    }
  }
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    driverError?: {
      code?: unknown;
      message?: unknown;
    };
  };
  const errorCode = candidate.driverError?.code ?? candidate.code;
  const errorMessage =
    candidate.driverError?.message ?? candidate.message ?? '';

  return (
    errorCode === '42P01' ||
    (typeof errorMessage === 'string' &&
      errorMessage.includes('relation "installation_state" does not exist'))
  );
}
