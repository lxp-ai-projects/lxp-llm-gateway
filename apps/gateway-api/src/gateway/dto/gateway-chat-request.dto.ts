import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { GatewayChatRequest } from '@lxp/contracts';

import { ChatMessageDto } from './chat-message.dto';

export class GatewayChatRequestDto implements GatewayChatRequest {
  @IsOptional()
  @IsIn(['nanogpt'])
  providerId?: 'nanogpt';

  @IsString()
  @MinLength(1)
  model!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
