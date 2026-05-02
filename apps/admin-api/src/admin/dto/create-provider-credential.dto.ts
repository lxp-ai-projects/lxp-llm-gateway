import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
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

export class CreateProviderCredentialDto {
  @IsOptional()
  @IsUUID()
  userUuid?: string;

  @IsIn(SUPPORTED_PROVIDER_IDS)
  providerId!: ProviderId;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apiToken?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  baseUrl?: string;

  @IsOptional()
  @IsIn(['tenant', 'user'])
  scope?: 'tenant' | 'user';
}
