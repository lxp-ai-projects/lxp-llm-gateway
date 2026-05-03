import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

import type { TenantProviderCredentialMode } from '../../persistence/entities/tenant-provider-configuration.entity';

const SUPPORTED_CREDENTIAL_MODES = [
  'platform_default',
  'tenant_byok',
  'user_byok',
  'hybrid',
] as const satisfies TenantProviderCredentialMode[];

export class UpdateTenantProviderConfigurationDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  defaultTextModel?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  defaultImageModel?: string;

  @IsIn(SUPPORTED_CREDENTIAL_MODES)
  credentialMode!: TenantProviderCredentialMode;

  @IsBoolean()
  preferUserCredentials!: boolean;

  @IsBoolean()
  allowPlatformFallback!: boolean;

  @IsBoolean()
  allowTenantFallback!: boolean;
}
