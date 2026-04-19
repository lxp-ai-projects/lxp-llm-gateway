import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import type { ProviderId } from '@lxp/domain';

const SUPPORTED_PROVIDER_IDS = [
  'nanogpt',
  'openrouter',
  'ollama',
  'groq',
] as const;

export class StoreProviderCredentialDto {
  @IsUUID()
  userUuid!: string;

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
}
