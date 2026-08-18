import { Injectable } from '@nestjs/common';

import type { VerificationDeliveryProvider } from './verification-delivery.provider';
import { MailerSendVerificationDeliveryProvider } from './mailersend-verification-delivery.provider';
import { SmtpVerificationDeliveryProvider } from './smtp-verification-delivery.provider';

@Injectable()
export class VerificationDeliveryService implements VerificationDeliveryProvider {
  readonly channel = 'email' as const;
  constructor(
    private readonly smtp: SmtpVerificationDeliveryProvider,
    private readonly mailerSend: MailerSendVerificationDeliveryProvider,
  ) {}
  isReady(): boolean {
    return this.selected().isReady();
  }
  getReadiness() {
    const provider = this.selectedProvider();
    const fromEmail =
      provider === 'mailersend'
        ? process.env.LXP_MAILERSEND_FROM_EMAIL
        : process.env.LXP_SMTP_FROM_EMAIL;
    const status =
      provider === 'smtp' && process.env.LXP_SMTP_ENABLED !== 'true'
        ? 'disabled'
        : this.isReady()
          ? 'ready'
          : 'not_ready';
    return {
      provider,
      status,
      fromEmail: fromEmail ?? null,
    };
  }
  sendChallenge(
    input: Parameters<VerificationDeliveryProvider['sendChallenge']>[0],
  ) {
    return this.selected().sendChallenge(input);
  }
  private selected(): VerificationDeliveryProvider {
    return this.selectedProvider() === 'mailersend'
      ? this.mailerSend
      : this.smtp;
  }
  private selectedProvider(): 'smtp' | 'mailersend' {
    const provider = process.env.LXP_EMAIL_DELIVERY_PROVIDER ?? 'smtp';
    if (provider !== 'smtp' && provider !== 'mailersend') {
      throw new Error(`Unsupported email delivery provider: ${provider}`);
    }
    return provider;
  }
}
