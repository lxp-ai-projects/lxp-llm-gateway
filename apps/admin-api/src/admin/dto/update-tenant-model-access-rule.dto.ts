import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateTenantModelAccessRuleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  providerId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  modelPattern?: string;

  @IsOptional()
  @IsIn(['text', 'image', 'stt', 'tts', 'embedding'])
  capability?: 'text' | 'image' | 'stt' | 'tts' | 'embedding';

  @IsOptional()
  @IsIn(['allow', 'deny'])
  effect?: 'allow' | 'deny';

  @IsOptional()
  @IsInt()
  @Min(1)
  maxInputTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxOutputTokens?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxImagesPerRequest?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  maxResolution?: string;

  @IsOptional()
  @IsInt()
  priority?: number;
}
