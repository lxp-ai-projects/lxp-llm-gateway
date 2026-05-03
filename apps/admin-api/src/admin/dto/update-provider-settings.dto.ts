import { ValidateIf, IsIn, IsString, MinLength } from 'class-validator';
import { PROVIDER_IDS } from '@lxp/domain';
import type { ProviderId } from '@lxp/domain';

export class UpdateProviderSettingsDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(PROVIDER_IDS)
  defaultProviderId?: ProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultModel?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(PROVIDER_IDS)
  defaultImageProviderId?: ProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultImageModel?: string | null;
}
