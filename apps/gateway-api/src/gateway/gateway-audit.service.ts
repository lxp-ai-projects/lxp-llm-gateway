import { Injectable, Logger } from '@nestjs/common';
import type { GatewayChatContentPart } from '@lxp/contracts';

import type { GatewayAuthIdentitySource } from '../auth/auth.types';

type GatewayAuditBase = {
  requestId: string;
  providerId: string;
  model: string;
  resolvedUserUuid: string;
  userFingerprint: string;
  identitySource: GatewayAuthIdentitySource;
  tenantId?: string;
  tenantSlug?: string;
  messageCount: number;
  messageCharacters: number;
  stream: boolean;
};

type GatewayAuditSuccess = GatewayAuditBase & {
  durationMs: number;
  outcome: 'success';
};

type GatewayAuditFailure = GatewayAuditBase & {
  durationMs: number;
  outcome: 'failure';
  error: string;
};

@Injectable()
export class GatewayAuditService {
  private readonly logger = new Logger(GatewayAuditService.name);

  logStarted(event: GatewayAuditBase): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.request.started',
        ...event,
      }),
    );
  }

  logSucceeded(event: GatewayAuditSuccess): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.request.completed',
        ...event,
      }),
    );
  }

  logFailed(event: GatewayAuditFailure): void {
    this.logger.error(
      JSON.stringify({
        event: 'gateway.request.failed',
        ...event,
      }),
    );
  }

  fingerprint(emailHash: string): string {
    return emailHash.slice(0, 16);
  }

  summarizeMessages(
    messages: Array<{ content: string | GatewayChatContentPart[] }>,
  ): {
    messageCount: number;
    messageCharacters: number;
  } {
    return {
      messageCount: messages.length,
      messageCharacters: messages.reduce(
        (total, message) => total + this.measureContentCharacters(message.content),
        0,
      ),
    };
  }

  private measureContentCharacters(
    content: string | GatewayChatContentPart[],
  ): number {
    if (typeof content === 'string') {
      return content.length;
    }

    return content.reduce((total, part) => {
      if (part.type === 'text') {
        return total + part.text.length;
      }

      return total;
    }, 0);
  }
}
