import {
  BadRequestException,
  Injectable,
  NotImplementedException,
} from '@nestjs/common';
import type { GatewayChatResponse } from '@lxp/contracts';

import type { GatewayAuthContext } from '../auth/auth.types';
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
    authContext: GatewayAuthContext,
  ): Promise<GatewayChatResponse> {
    const provider = this.providerRegistry.getProvider(request.providerId);
    const requestId = crypto.randomUUID();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    const apiKey = await this.providerCredentialService.resolveApiKey(
      authContext.emailHash,
      provider.providerId,
    );

    return provider.chat(request, {
      requestId,
      userId: authContext.userId,
      providerCredential: {
        apiKey,
      },
    });
  }

  async chatStream(
    request: GatewayChatRequestDto,
    authContext: GatewayAuthContext,
  ): Promise<{ requestId: string; stream: ReadableStream<Uint8Array> }> {
    const provider = this.providerRegistry.getProvider(request.providerId);
    const requestId = crypto.randomUUID();

    if (!request.messages.length) {
      throw new BadRequestException('At least one message is required.');
    }

    if (!provider.supportsStreaming() || !provider.chatStream) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not support streaming.`,
      );
    }

    const apiKey = await this.providerCredentialService.resolveApiKey(
      authContext.emailHash,
      provider.providerId,
    );

    const stream = await provider.chatStream(request, {
      requestId,
      userId: authContext.userId,
      providerCredential: {
        apiKey,
      },
    });

    return {
      requestId,
      stream,
    };
  }
}
