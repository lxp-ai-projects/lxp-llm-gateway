import { BadRequestException, Injectable } from '@nestjs/common';

import type {
  ConversationTransferConversation,
  ConversationTransferDocument,
} from './conversation-transfer.types';

const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;
const ZIP_VERSION = 20;
const ZIP_STORE_METHOD = 0;
const CRC32_TABLE = buildCrc32Table();

type ZipEntry = {
  name: string;
  data: Buffer;
};

@Injectable()
export class ConversationTransferService {
  exportConversation(conversation: ConversationTransferConversation): {
    content: Buffer;
    fileName: string;
  } {
    const document = this.createConversationDocument(conversation);
    return {
      content: Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8'),
      fileName: `${this.sanitizeFileName(conversation.title || 'conversation')}.json`,
    };
  }

  exportConversationArchive(
    conversations: ConversationTransferConversation[],
  ): {
    content: Buffer;
    fileName: string;
  } {
    if (!conversations.length) {
      throw new BadRequestException(
        'At least one conversation is required for archive export.',
      );
    }

    const entries = conversations.map((conversation, index) => {
      const document = this.createConversationDocument(conversation);
      return {
        name: `${String(index + 1).padStart(2, '0')}-${this.sanitizeFileName(conversation.title || 'conversation')}.json`,
        data: Buffer.from(`${JSON.stringify(document, null, 2)}\n`, 'utf8'),
      };
    });

    return {
      content: this.buildZipArchive(entries),
      fileName: `lxp-chat-conversations-${new Date().toISOString().slice(0, 10)}.zip`,
    };
  }

  importConversationFile(
    fileName: string,
    content: Buffer,
  ): ConversationTransferConversation[] {
    if (this.looksLikeZip(fileName, content)) {
      return this.parseZipArchive(content).flatMap((entry) =>
        this.parseJsonDocument(entry.data.toString('utf8')),
      );
    }

    return this.parseJsonDocument(content.toString('utf8'));
  }

  private createConversationDocument(
    conversation: ConversationTransferConversation,
  ): ConversationTransferDocument {
    return {
      format: 'lxp-chat-conversation',
      version: 1,
      exportedAt: new Date().toISOString(),
      conversation,
    };
  }

  private parseJsonDocument(
    rawContent: string,
  ): ConversationTransferConversation[] {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new BadRequestException(
        'The imported JSON conversation file is invalid.',
      );
    }

    if (Array.isArray(parsed)) {
      return parsed.map((entry) => this.assertConversation(entry));
    }

    if (
      parsed &&
      typeof parsed === 'object' &&
      'format' in parsed &&
      (parsed as { format?: string }).format === 'lxp-chat-conversation'
    ) {
      return [
        this.assertConversation(
          (parsed as { conversation?: unknown }).conversation,
        ),
      ];
    }

    return [this.assertConversation(parsed)];
  }

  private assertConversation(value: unknown): ConversationTransferConversation {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException(
        'The imported conversation payload is invalid.',
      );
    }

    const candidate = value as Partial<ConversationTransferConversation>;
    if (
      !candidate.id ||
      !candidate.title ||
      !candidate.model ||
      !candidate.providerId ||
      !Array.isArray(candidate.messages) ||
      !candidate.updatedAt
    ) {
      throw new BadRequestException(
        'The imported conversation payload is missing required fields.',
      );
    }

    return candidate as ConversationTransferConversation;
  }

  private looksLikeZip(fileName: string, content: Buffer): boolean {
    return (
      fileName.toLowerCase().endsWith('.zip') ||
      (content.length >= 4 &&
        content.readUInt32LE(0) === ZIP_LOCAL_FILE_HEADER_SIGNATURE)
    );
  }

  private sanitizeFileName(title: string): string {
    return (
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64) || 'conversation'
    );
  }

  private buildZipArchive(entries: ZipEntry[]): Buffer {
    const localParts: Buffer[] = [];
    const centralParts: Buffer[] = [];
    let offset = 0;

    for (const entry of entries) {
      const fileName = Buffer.from(entry.name, 'utf8');
      const crc32 = computeCrc32(entry.data);

      const localHeader = Buffer.alloc(30);
      localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0);
      localHeader.writeUInt16LE(ZIP_VERSION, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(ZIP_STORE_METHOD, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc32, 14);
      localHeader.writeUInt32LE(entry.data.length, 18);
      localHeader.writeUInt32LE(entry.data.length, 22);
      localHeader.writeUInt16LE(fileName.length, 26);
      localHeader.writeUInt16LE(0, 28);

      localParts.push(localHeader, fileName, entry.data);

      const centralHeader = Buffer.alloc(46);
      centralHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE, 0);
      centralHeader.writeUInt16LE(ZIP_VERSION, 4);
      centralHeader.writeUInt16LE(ZIP_VERSION, 6);
      centralHeader.writeUInt16LE(0, 8);
      centralHeader.writeUInt16LE(ZIP_STORE_METHOD, 10);
      centralHeader.writeUInt16LE(0, 12);
      centralHeader.writeUInt16LE(0, 14);
      centralHeader.writeUInt32LE(crc32, 16);
      centralHeader.writeUInt32LE(entry.data.length, 20);
      centralHeader.writeUInt32LE(entry.data.length, 24);
      centralHeader.writeUInt16LE(fileName.length, 28);
      centralHeader.writeUInt16LE(0, 30);
      centralHeader.writeUInt16LE(0, 32);
      centralHeader.writeUInt16LE(0, 34);
      centralHeader.writeUInt16LE(0, 36);
      centralHeader.writeUInt32LE(0, 38);
      centralHeader.writeUInt32LE(offset, 42);

      centralParts.push(centralHeader, fileName);
      offset += localHeader.length + fileName.length + entry.data.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
    endRecord.writeUInt16LE(0, 4);
    endRecord.writeUInt16LE(0, 6);
    endRecord.writeUInt16LE(entries.length, 8);
    endRecord.writeUInt16LE(entries.length, 10);
    endRecord.writeUInt32LE(centralDirectory.length, 12);
    endRecord.writeUInt32LE(offset, 16);
    endRecord.writeUInt16LE(0, 20);

    return Buffer.concat([...localParts, centralDirectory, endRecord]);
  }

  private parseZipArchive(content: Buffer): ZipEntry[] {
    const endOffset = this.findEndOfCentralDirectoryOffset(content);
    const entryCount = content.readUInt16LE(endOffset + 10);
    const centralDirectoryOffset = content.readUInt32LE(endOffset + 16);

    const entries: ZipEntry[] = [];
    let cursor = centralDirectoryOffset;

    for (let index = 0; index < entryCount; index += 1) {
      if (
        content.readUInt32LE(cursor) !== ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE
      ) {
        throw new BadRequestException(
          'The ZIP archive central directory is invalid.',
        );
      }

      const compressionMethod = content.readUInt16LE(cursor + 10);
      const compressedSize = content.readUInt32LE(cursor + 20);
      const fileNameLength = content.readUInt16LE(cursor + 28);
      const extraFieldLength = content.readUInt16LE(cursor + 30);
      const fileCommentLength = content.readUInt16LE(cursor + 32);
      const localHeaderOffset = content.readUInt32LE(cursor + 42);
      const fileName = content
        .subarray(cursor + 46, cursor + 46 + fileNameLength)
        .toString('utf8');

      if (compressionMethod !== ZIP_STORE_METHOD) {
        throw new BadRequestException(
          'Only uncompressed ZIP archives exported by this application can be imported.',
        );
      }

      const localFileNameLength = content.readUInt16LE(localHeaderOffset + 26);
      const localExtraFieldLength = content.readUInt16LE(
        localHeaderOffset + 28,
      );
      const dataOffset =
        localHeaderOffset + 30 + localFileNameLength + localExtraFieldLength;
      const data = content.subarray(dataOffset, dataOffset + compressedSize);

      if (!fileName.endsWith('.json')) {
        cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
        continue;
      }

      entries.push({
        name: fileName,
        data,
      });

      cursor += 46 + fileNameLength + extraFieldLength + fileCommentLength;
    }

    return entries;
  }

  private findEndOfCentralDirectoryOffset(content: Buffer): number {
    for (
      let offset = content.length - 22;
      offset >= Math.max(0, content.length - 65_557);
      offset -= 1
    ) {
      if (
        content.readUInt32LE(offset) === ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE
      ) {
        return offset;
      }
    }

    throw new BadRequestException('The ZIP archive footer could not be found.');
  }
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }

  return table;
}

function computeCrc32(content: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of content) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
