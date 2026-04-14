import { Injectable } from '@nestjs/common';
import { createHmac } from 'node:crypto';

import { EncryptionService } from './encryption.service';

function getLookupKey(): Buffer {
  const encoded = process.env.LXP_EMAIL_LOOKUP_KEY;
  if (!encoded) {
    throw new Error('Missing required environment variable: LXP_EMAIL_LOOKUP_KEY');
  }

  const key = Buffer.from(encoded, 'base64');
  if (key.length !== 32) {
    throw new Error('LXP_EMAIL_LOOKUP_KEY must be a base64-encoded 32-byte key.');
  }

  return key;
}

export interface ProtectedEmail {
  emailHash: string;
  encryptedEmail: string;
  emailIv: string;
  emailAuthTag: string;
  emailKeyVersion: number;
}

@Injectable()
export class EmailProtectionService {
  private readonly lookupKey = getLookupKey();

  constructor(private readonly encryptionService: EncryptionService) {}

  protect(email: string): ProtectedEmail {
    const normalizedEmail = email.trim().toLowerCase();
    const encrypted = this.encryptionService.encrypt(normalizedEmail);

    return {
      emailHash: createHmac('sha256', this.lookupKey)
        .update(normalizedEmail)
        .digest('hex'),
      encryptedEmail: encrypted.ciphertext,
      emailIv: encrypted.iv,
      emailAuthTag: encrypted.authTag,
      emailKeyVersion: encrypted.keyVersion,
    };
  }

  reveal(payload: ProtectedEmail): string {
    return this.encryptionService.decrypt({
      ciphertext: payload.encryptedEmail,
      iv: payload.emailIv,
      authTag: payload.emailAuthTag,
      keyVersion: payload.emailKeyVersion,
    });
  }
}
