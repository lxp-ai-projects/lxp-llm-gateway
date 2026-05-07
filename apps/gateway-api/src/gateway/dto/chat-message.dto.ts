import { Allow, IsIn, IsOptional, IsString } from 'class-validator';
import type { GatewayChatContentPart } from '@lxp/contracts';

export class ChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @Allow()
  content!: string | GatewayChatContentPart[];

  @IsOptional()
  @IsString()
  reasoningContent?: string;
}
