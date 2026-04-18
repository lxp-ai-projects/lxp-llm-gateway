import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

import { AccessTokenGuard } from '../auth/access-token.guard';
import { ExportConversationArchiveDto } from './dto/export-conversation-archive.dto';
import { ExportConversationDto } from './dto/export-conversation.dto';
import { ConversationTransferService } from './conversation-transfer.service';

@Controller('chat-transfers')
@UseGuards(AccessTokenGuard)
export class ConversationTransferController {
  constructor(
    private readonly conversationTransferService: ConversationTransferService,
  ) {}

  @Post('export/conversation')
  exportConversation(
    @Body() dto: ExportConversationDto,
    @Res() response: Response,
  ): void {
    const exported = this.conversationTransferService.exportConversation(
      dto.conversation,
    );
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    response.send(exported.content);
  }

  @Post('export/archive')
  exportConversationArchive(
    @Body() dto: ExportConversationArchiveDto,
    @Res() response: Response,
  ): void {
    const exported = this.conversationTransferService.exportConversationArchive(
      dto.conversations,
    );
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.fileName}"`,
    );
    response.send(exported.content);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  importConversationFile(
    @UploadedFile() file?: { originalname: string; buffer: Buffer },
  ) {
    if (!file) {
      throw new BadRequestException('A conversation import file is required.');
    }

    return {
      conversations: this.conversationTransferService.importConversationFile(
        file.originalname,
        file.buffer,
      ),
    };
  }
}
