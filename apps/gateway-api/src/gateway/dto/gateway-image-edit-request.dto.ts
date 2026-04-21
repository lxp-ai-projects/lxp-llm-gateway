import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
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
  @IsString()
  @MinLength(1)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  background?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  quality?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  outputFormat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  outputCompression?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  inputFidelity?: string;
}
