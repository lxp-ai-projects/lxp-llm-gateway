import { createHash, timingSafeEqual } from 'node:crypto';
import {
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  InstallationStateEntity,
  INSTALLATION_STATE_SINGLETON_ID,
} from '../persistence/entities/installation-state.entity';
import { SetupStatusService } from './setup-status.service';

@Injectable()
export class SetupAccessService {
  constructor(
    @InjectRepository(InstallationStateEntity)
    private readonly installationStateRepository: Repository<InstallationStateEntity>,
    private readonly setupStatusService: SetupStatusService,
  ) {}

  async assertSetupOpen(): Promise<void> {
    await this.setupStatusService.ensureInstallationState();

    const state = await this.installationStateRepository.findOne({
      where: { id: INSTALLATION_STATE_SINGLETON_ID },
    });

    if (!state || state.status === 'COMPLETED') {
      throw new GoneException('Setup is no longer available.');
    }
  }

  async verifySetupToken(rawToken: string | undefined): Promise<void> {
    await this.assertSetupOpen();

    const configuredHash = process.env.LXP_SETUP_TOKEN_HASH?.trim();
    if (!configuredHash) {
      throw new UnauthorizedException('Setup token is required.');
    }

    const token = rawToken?.trim();
    if (!token) {
      throw new UnauthorizedException('Setup token is required.');
    }

    const expectedHash = this.parseConfiguredHash(configuredHash);
    const actualHash = createHash('sha256').update(token).digest('hex');
    const expectedBuffer = Buffer.from(expectedHash, 'hex');
    const actualBuffer = Buffer.from(actualHash, 'hex');

    if (
      expectedBuffer.length !== actualBuffer.length ||
      !timingSafeEqual(expectedBuffer, actualBuffer)
    ) {
      throw new UnauthorizedException('Invalid setup token.');
    }
  }

  private parseConfiguredHash(configuredHash: string): string {
    const [, algorithm, hash] =
      /^(sha256):([a-f0-9]{64})$/i.exec(configuredHash) ?? [];

    if (algorithm?.toLowerCase() !== 'sha256' || !hash) {
      throw new UnauthorizedException('Setup token is required.');
    }

    return hash.toLowerCase();
  }
}

