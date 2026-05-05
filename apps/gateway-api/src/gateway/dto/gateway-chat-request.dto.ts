import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsPositive,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { GatewayChatRequest } from '@lxp/contracts';
import { PROVIDER_IDS, type ProviderId } from '@lxp/domain';

import { ChatMessageDto } from './chat-message.dto';

class GatewayAnthropicExtendedThinkingDto {
  @IsIn(['disabled', 'adaptive', 'budget'])
  mode!: 'disabled' | 'adaptive' | 'budget';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1024)
  budgetTokens?: number;
}

class GatewayAnthropicProviderOptionsDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => GatewayAnthropicExtendedThinkingDto)
  extendedThinking?: GatewayAnthropicExtendedThinkingDto;
}

class GatewayChatProviderOptionsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => GatewayAnthropicProviderOptionsDto)
  anthropic?: GatewayAnthropicProviderOptionsDto;
}

export class GatewayChatRequestDto implements GatewayChatRequest {
  @IsOptional()
  @IsIn(PROVIDER_IDS)
  providerId?: ProviderId;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  maxOutputTokens?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => GatewayChatProviderOptionsDto)
  providerOptions?: GatewayChatRequest['providerOptions'];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages!: ChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;
}
