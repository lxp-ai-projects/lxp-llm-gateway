import { ValidateIf, IsIn, IsString, MinLength } from 'class-validator';

export class UpdateProviderSettingsDto {
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsIn(['nanogpt'])
  defaultProviderId?: 'nanogpt' | null;

  @ValidateIf((_, value) => value !== undefined && value !== null)
  @IsString()
  @MinLength(1)
  defaultModel?: string | null;
}
