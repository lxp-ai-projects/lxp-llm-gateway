import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import type { EncryptedValue } from './encryption.types';

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}

function parseBase64Key(value: string, keyName: string): Buffer {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) {
    throw new Error(`${keyName} must be a base64-encoded 32-byte key.`);
  }

  return key;
}

@Injectable()
export class EncryptionService {
  private readonly key = parseBase64Key(
    getRequiredEnv('LXP_ENCRYPTION_MASTER_KEY'),
    'LXP_ENCRYPTION_MASTER_KEY',
  );

  private readonly keyVersion = Number.parseInt(
    getRequiredEnv('LXP_ENCRYPTION_KEY_VERSION'),
    10,
  );

  encrypt(plaintext: string): EncryptedValue {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyVersion: this.keyVersion,
    };
  }

  decrypt(payload: EncryptedValue): string {
    if (payload.keyVersion !== this.keyVersion) {
      throw new Error(
        `Unsupported encryption key version: ${payload.keyVersion}.`,
      );
    }

    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.key,
      Buffer.from(payload.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'base64'));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'base64')),
      decipher.final(),
    ]);

    return plaintext.toString('utf8');
  }
}
