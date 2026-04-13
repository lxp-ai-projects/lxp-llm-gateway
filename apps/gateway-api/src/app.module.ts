import { Module } from '@nestjs/common';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';

import { GatewayController } from './gateway.controller';
import { LLM_PROVIDER } from './provider.token';

@Module({
  controllers: [GatewayController],
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: () => new NanoGptProviderAdapter(),
    },
  ],
})
export class AppModule {}
