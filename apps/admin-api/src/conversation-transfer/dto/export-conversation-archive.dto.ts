import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';

import { ConversationTransferConversationDto } from './conversation-transfer.dto';

export class ExportConversationArchiveDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ConversationTransferConversationDto)
  conversations!: ConversationTransferConversationDto[];
}
