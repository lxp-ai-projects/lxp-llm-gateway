import { createHash } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { Injectable } from '@nestjs/common';

@Injectable()
export class MediaStorageService {
  private readonly baseDir = process.env.GATEWAY_MEDIA_STORAGE_DIR?.trim()
    ? path.resolve(process.env.GATEWAY_MEDIA_STORAGE_DIR)
    : path.resolve(process.cwd(), 'tmp', 'gateway-media');

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
    const relativePath = path.join(input.tenantId, `${input.assetId}.${extension}`);
    const absolutePath = path.join(this.baseDir, relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, input.data);

    return {
      storageKey: relativePath.replace(/\\/g, '/'),
      byteSize: input.data.byteLength,
      sha256: createHash('sha256').update(input.data).digest('hex'),
    };
  }

  async readAsset(storageKey: string): Promise<Buffer> {
    return readFile(path.join(this.baseDir, storageKey));
  }

  async deleteAsset(storageKey: string): Promise<void> {
    try {
      await unlink(path.join(this.baseDir, storageKey));
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
}
