import { ValidateIf, IsIn, IsString, MinLength } from 'class-validator';
import { IMAGE_PROVIDER_IDS, PROVIDER_IDS } from '@lxp/domain';
import type { ImageProviderId, ProviderId } from '@lxp/domain';

export class UpdateProviderSettingsDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(PROVIDER_IDS)
  defaultProviderId?: ProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultModel?: string | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(IMAGE_PROVIDER_IDS)
  defaultImageProviderId?: ImageProviderId | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultImageModel?: string | null;
}
