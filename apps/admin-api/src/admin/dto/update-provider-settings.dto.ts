import { ValidateIf, IsIn, IsString, MinLength } from 'class-validator';
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

export class UpdateProviderSettingsDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(SUPPORTED_PROVIDER_IDS)
  defaultProviderId?: ProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultModel?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(SUPPORTED_PROVIDER_IDS)
  defaultImageProviderId?: ProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultImageModel?: string | null;
}
