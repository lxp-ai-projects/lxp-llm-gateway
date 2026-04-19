import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import type { GatewayImageEditRequest } from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';

import { GatewayImageReferenceDto } from './gateway-image-reference.dto';

const SUPPORTED_PROVIDER_IDS = [
  'nanogpt',
  'openrouter',
  'ollama',
  'groq',
  'google',
  'xai',
  'openai',
  'anthropic',
] as const;

export class GatewayImageEditRequestDto implements GatewayImageEditRequest {
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDER_IDS)
  providerId?: ProviderId;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GatewayImageReferenceDto)
  images!: GatewayImageReferenceDto[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  n?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  aspectRatio?: string;

  @IsOptional()
  @IsIn(['url', 'b64_json'])
  responseFormat?: 'url' | 'b64_json';

  @IsOptional()
  @IsIn(['1k', '2k'])
  resolution?: '1k' | '2k';
}
