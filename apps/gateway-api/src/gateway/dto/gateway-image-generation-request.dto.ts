import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import type { GatewayImageGenerationRequest } from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';

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

export class GatewayImageGenerationRequestDto
  implements GatewayImageGenerationRequest
{
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
}
