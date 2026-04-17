import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ConversationTransferMessageDto {
  @IsString()
  id!: string;

  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  reasoning?: string;

  @IsISO8601()
  createdAt!: string;
}

export class ConversationTransferConversationDto {
  @IsString()
  id!: string;

  @IsString()
  title!: string;

  @IsString()
  model!: string;

  @IsString()
  providerId!: string;

  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationTransferMessageDto)
  messages!: ConversationTransferMessageDto[];

  @IsISO8601()
  updatedAt!: string;
}
