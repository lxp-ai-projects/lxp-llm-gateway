import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { GatewayImageGenerationRequest } from '@lxp/contracts';
import { IMAGE_PROVIDER_IDS, type ImageProviderId } from '@lxp/domain';

export class GatewayImageGenerationRequestDto
  implements GatewayImageGenerationRequest
{
  @IsOptional()
  @IsIn(IMAGE_PROVIDER_IDS)
  providerId?: ImageProviderId;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsString()
  @MinLength(1)
  prompt!: string;

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
  @IsIn(['low', 'auto'])
  moderation?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  outputFormat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  outputCompression?: number;
}
