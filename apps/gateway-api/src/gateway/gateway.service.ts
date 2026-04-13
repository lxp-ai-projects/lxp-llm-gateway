import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class GatewayService {
  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  async chat(request: GatewayChatRequestDto): Promise<GatewayChatResponse> {
    if (request.stream) {
      throw new NotImplementedException(
        'Streaming is not implemented in Phase 1.',
      );
    }

    const provider = this.providerRegistry.getProvider(request.providerId);
    const requestId = crypto.randomUUID();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    return provider.chat(request, {
      requestId,
    });
  }
}
