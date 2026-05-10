import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaStorageService {
  private readonly baseDir = process.env.GATEWAY_MEDIA_STORAGE_DIR?.trim()
    ? path.resolve(process.env.GATEWAY_MEDIA_STORAGE_DIR)
    : path.resolve(process.cwd(), 'tmp', 'gateway-media');
  private readonly resolvedBaseDir = path.resolve(this.baseDir);

  async writeVideoAsset(input: {
    tenantId: string;
    assetId: string;
    mimeType?: string | null;
    data: Buffer;
  }): Promise<{
    storageKey: string;
    byteSize: number;
    sha256: string;
  }> {
    const extension = this.resolveExtension(input.mimeType);
    const tenantId = this.sanitizePathSegment(input.tenantId, 'tenantId');
    const assetId = this.sanitizePathSegment(input.assetId, 'assetId');
    const relativePath = path.join(tenantId, `${assetId}.${extension}`);
    const absolutePath = this.resolveStoragePath(relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.data);

    return {
      storageKey: relativePath.replace(/\\/g, '/'),
      byteSize: input.data.byteLength,
      sha256: createHash('sha256').update(input.data).digest('hex'),
    };
  }

  async readAsset(storageKey: string): Promise<Buffer> {
    return readFile(this.resolveStoragePath(storageKey));
  }

  async deleteAsset(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStoragePath(storageKey));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        return;
      }

      throw error;
    }
  }

  private resolveExtension(mimeType?: string | null): string {
    switch (mimeType) {
      case 'video/webm':
        return 'webm';
      case 'video/quicktime':
        return 'mov';
      case 'video/mp4':
      default:
        return 'mp4';
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const normalizedStorageKey = storageKey.replace(/\\/g, '/');
    const segments = normalizedStorageKey
      .split('/')
      .filter((segment) => segment.length > 0)
      .map((segment) => this.sanitizePathSegment(segment, 'storageKey'));
    const targetPath = path.resolve(this.resolvedBaseDir, ...segments);

    if (
      targetPath !== this.resolvedBaseDir &&
      !targetPath.startsWith(`${this.resolvedBaseDir}${path.sep}`)
    ) {
      throw new Error('Resolved media storage path escapes the configured base directory.');
    }

    return targetPath;
  }

  private sanitizePathSegment(value: string, fieldName: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new Error(`${fieldName} is required.`);
    }

    if (
      trimmedValue === '.' ||
      trimmedValue === '..' ||
      trimmedValue.includes('/') ||
      trimmedValue.includes('\\') ||
      /[<>:"|?*\x00-\x1f]/.test(trimmedValue)
    ) {
      throw new Error(`${fieldName} contains an invalid path segment.`);
    }

    return trimmedValue;
  }
}
