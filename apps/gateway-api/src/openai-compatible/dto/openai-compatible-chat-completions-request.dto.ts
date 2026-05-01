import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

class OpenAiCompatibleChatMessageDto {
  @IsIn(['system', 'user', 'assistant'])
  role!: 'system' | 'user' | 'assistant';

  @Allow()
  content!: unknown;

  @IsOptional()
  @Allow()
  name?: unknown;
}

export class OpenAiCompatibleChatCompletionsRequestDto {
  @IsString()
  @MinLength(1)
  model!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OpenAiCompatibleChatMessageDto)
  messages!: OpenAiCompatibleChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @Allow()
  temperature?: unknown;

  @IsOptional()
  @Allow()
  top_p?: unknown;

  @IsOptional()
  @Allow()
  max_tokens?: unknown;

  @IsOptional()
  @Allow()
  max_completion_tokens?: unknown;

  @IsOptional()
  @Allow()
  frequency_penalty?: unknown;

  @IsOptional()
  @Allow()
  presence_penalty?: unknown;

  @IsOptional()
  @Allow()
  stop?: unknown;

  @IsOptional()
  @Allow()
  n?: unknown;

  @IsOptional()
  @Allow()
  user?: unknown;

  @IsOptional()
  @Allow()
  response_format?: unknown;

  @IsOptional()
  @Allow()
  seed?: unknown;

  @IsOptional()
  @Allow()
  tools?: unknown;

  @IsOptional()
  @Allow()
  tool_choice?: unknown;

  @IsOptional()
  @Allow()
  stream_options?: unknown;

  @IsOptional()
  @Allow()
  metadata?: unknown;

  @IsOptional()
  @Allow()
  reasoning_effort?: unknown;
}
