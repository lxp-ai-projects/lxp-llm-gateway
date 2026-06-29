import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PROVIDER_IDS, type ProviderId } from '@lxp/domain';

import { GatewayVideoReferenceDto } from './gateway-video-reference.dto';

export class GatewayVideoFrameImageReferenceDto {
  @ValidateNested()
  @Type(() => GatewayVideoReferenceDto)
  image!: GatewayVideoReferenceDto;

  @IsIn(['first_frame', 'last_frame'])
  frameType!: 'first_frame' | 'last_frame';
}

export class GatewayVideoGenerationRequestDto {
  @IsOptional()
  @IsIn(PROVIDER_IDS)
  providerId?: ProviderId;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  idempotencyKey?: string;

  @IsString()
  @MinLength(1)
  prompt!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  durationSeconds?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  aspectRatio?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  resolution?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  size?: string;

  @IsOptional()
  @IsBoolean()
  generateAudio?: boolean;

  @IsOptional()
  @IsInt()
  seed?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GatewayVideoFrameImageReferenceDto)
  frameImages?: GatewayVideoFrameImageReferenceDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GatewayVideoReferenceDto)
  referenceImages?: GatewayVideoReferenceDto[];

  @IsOptional()
  @IsObject()
  providerOptions?: Record<string, unknown>;
}
