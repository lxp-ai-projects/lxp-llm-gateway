import { Injectable, OnApplicationBootstrap } from '@nestjs/common';

import { SetupStatusService } from './setup-status.service';

@Injectable()
export class SetupStatusBootstrapService implements OnApplicationBootstrap {
  constructor(private readonly setupStatusService: SetupStatusService) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.setupStatusService.ensureInstallationState();
  }
}
