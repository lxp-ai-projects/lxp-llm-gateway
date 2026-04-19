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
import type { ProviderId } from '@lxp/domain';

import { ChatMessageDto } from './chat-message.dto';

const SUPPORTED_PROVIDER_IDS = [
  'nanogpt',
  'openrouter',
  'ollama',
  'groq',
  'xai',
  'openai',
  'anthropic',
] as const;

export class GatewayChatRequestDto implements GatewayChatRequest {
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDER_IDS)
  providerId?: ProviderId;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
