import { Injectable } from '@nestjs/common';
import { EmailParams, MailerSend, Recipient, Sender } from 'mailersend';

import type { VerificationDeliveryProvider } from './verification-delivery.provider';
import { buildVerificationEmailContent } from './verification-email-content';

const MAILERSEND_TIMEOUT_MS = 15_000;

@Injectable()
export class MailerSendVerificationDeliveryProvider implements VerificationDeliveryProvider {
  readonly channel = 'email' as const;

  isReady(): boolean {
    return (
      process.env.LXP_EMAIL_DELIVERY_PROVIDER === 'mailersend' &&
      Boolean(
        process.env.LXP_MAILERSEND_API_KEY &&
        process.env.LXP_MAILERSEND_FROM_EMAIL,
      )
    );
  }

  async sendChallenge(input: {
    tenantDisplayName: string;
    destination: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    if (!this.isReady()) throw new Error('MailerSend delivery is not ready.');
    const content = buildVerificationEmailContent(input);
    const email = new EmailParams()
      .setFrom(
        new Sender(
          process.env.LXP_MAILERSEND_FROM_EMAIL!,
          process.env.LXP_MAILERSEND_FROM_NAME || 'LXP Gateway',
        ),
      )
      .setTo([new Recipient(input.destination)])
      .setSubject(content.subject)
      .setText(content.text)
      .setHtml(content.html)
      .setSettings({
        track_clicks: false,
        track_opens: false,
        track_content: false,
      });
    const request = new MailerSend({
      apiKey: process.env.LXP_MAILERSEND_API_KEY!,
    }).email.send(email);
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        request,
        new Promise<never>((_, reject) => {
          timeout = setTimeout(
            () => reject(new Error('MailerSend delivery timed out.')),
            MAILERSEND_TIMEOUT_MS,
          );
        }),
      ]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
}
