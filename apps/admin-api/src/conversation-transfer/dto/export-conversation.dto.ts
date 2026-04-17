import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { ConversationTransferConversationDto } from './conversation-transfer.dto';

export class ExportConversationDto {
  @ValidateNested()
  @Type(() => ConversationTransferConversationDto)
  conversation!: ConversationTransferConversationDto;
}
