import { Injectable, Logger } from '@nestjs/common';

type GatewayAuditBase = {
  requestId: string;
  providerId: string;
  model: string;
  userFingerprint: string;
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

  summarizeMessages(messages: Array<{ content: string }>): {
    messageCount: number;
    messageCharacters: number;
  } {
    return {
      messageCount: messages.length,
      messageCharacters: messages.reduce((total, message) => total + message.content.length, 0),
    };
  }
}
