import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreateTenantModelAccessRuleDto {
  @IsString()
  @MinLength(1)
  providerId!: string;

  @IsString()
  @MinLength(1)
  modelPattern!: string;

  @IsIn(['text', 'image', 'stt', 'tts', 'embedding'])
  capability!: 'text' | 'image' | 'stt' | 'tts' | 'embedding';

  @IsIn(['allow', 'deny'])
  effect!: 'allow' | 'deny';

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
