import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import type { GatewayChatRequestDto } from './dto/gateway-chat-request.dto';
import { ProviderCredentialService } from './provider-credential.service';
import { ProviderRegistryService } from './provider-registry.service';

@Injectable()
export class GatewayService {
  constructor(
    private readonly providerRegistry: ProviderRegistryService,
    private readonly providerCredentialService: ProviderCredentialService,
  ) {}

  async chat(
    request: GatewayChatRequestDto,
    userId: string | undefined,
  ): Promise<GatewayChatResponse> {
    if (request.stream) {
      throw new NotImplementedException(
        'Streaming is not implemented in Phase 1.',
      );
    }

    const provider = this.providerRegistry.getProvider(request.providerId);
    const requestId = crypto.randomUUID();
    const resolvedUserId = userId?.trim() ?? '';

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    const apiKey = await this.providerCredentialService.resolveApiKey(
      resolvedUserId,
      provider.providerId,
    );

    return provider.chat(request, {
      requestId,
      userId: resolvedUserId,
      providerCredential: {
        apiKey,
      },
    });
  }
}
