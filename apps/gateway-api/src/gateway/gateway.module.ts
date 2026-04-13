import { Module } from '@nestjs/common';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';

import { GatewayController } from './gateway.controller';
import { GatewayService } from './gateway.service';
import { ProviderRegistryService } from './provider-registry.service';
import { LLM_PROVIDERS } from './provider.tokens';

@Module({
  controllers: [GatewayController],
  providers: [
    GatewayService,
    ProviderRegistryService,
    {
      provide: LLM_PROVIDERS,
      useFactory: () => [new NanoGptProviderAdapter()],
    },
  ],
})
export class GatewayModule {}
