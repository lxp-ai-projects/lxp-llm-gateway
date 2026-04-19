import { IsIn, IsOptional } from 'class-validator';
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

export class ListModelsQueryDto {
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDER_IDS)
  providerId?: ProviderId;
}
