import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

import type { VerificationDeliveryProvider } from './verification-delivery.provider';
import { buildVerificationEmailContent } from './verification-email-content';

@Injectable()
export class SmtpVerificationDeliveryProvider implements VerificationDeliveryProvider {
  readonly channel = 'email' as const;

  isReady(): boolean {
    return (
      process.env.LXP_SMTP_ENABLED === 'true' &&
      Boolean(
        process.env.LXP_SMTP_HOST &&
        process.env.LXP_SMTP_USER &&
        process.env.LXP_SMTP_PASSWORD &&
        process.env.LXP_SMTP_FROM_EMAIL,
      )
    );
  }

  async sendChallenge(input: {
    tenantDisplayName: string;
    destination: string;
    code: string;
    expiresInMinutes: number;
  }): Promise<void> {
    if (!this.isReady()) throw new Error('SMTP delivery is not ready.');
    const secure = process.env.LXP_SMTP_SECURE === 'true';
    const transporter = nodemailer.createTransport({
      host: process.env.LXP_SMTP_HOST,
      port: Number(process.env.LXP_SMTP_PORT ?? (secure ? 465 : 587)),
      secure,
      requireTLS: process.env.LXP_SMTP_REQUIRE_TLS !== 'false',
      auth: {
        user: process.env.LXP_SMTP_USER!,
        pass: process.env.LXP_SMTP_PASSWORD!,
      },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    });
    const content = buildVerificationEmailContent(input);
    await transporter.sendMail({
      from: {
        address: process.env.LXP_SMTP_FROM_EMAIL!,
        name: process.env.LXP_SMTP_FROM_NAME || 'LXP Gateway',
      },
      to: input.destination,
      ...content,
    });
  }
}
