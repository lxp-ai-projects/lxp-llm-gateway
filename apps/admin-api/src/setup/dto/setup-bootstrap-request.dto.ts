import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { IsEmail } from 'class-validator';
import { PROVIDER_IDS, type ProviderId } from '@lxp/domain';

class SetupBootstrapSuperAdminDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;
}

class SetupBootstrapTenantDto {
  @IsString()
  @MinLength(1)
  slug!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  allowUserCredentialOverride?: boolean;
}

class SetupBootstrapProviderCredentialDto {
  @IsIn(PROVIDER_IDS)
  providerId!: ProviderId;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apiToken?: string;

  @IsOptional()
  @IsUrl({
    require_tld: false,
    require_protocol: true,
    require_host: true,
  })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  defaultTextModel?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  defaultImageModel?: string;
}

class SetupBootstrapTenantPolicyDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  monthlyBudgetUsd?: string;

  @IsOptional()
  requestsPerMinute?: number;

  @IsOptional()
  tokensPerMinute?: number;

  @IsOptional()
  monthlyTokenLimit?: number;

  @IsOptional()
  imageRequestsPerMonth?: number;

  @IsOptional()
  maxInputTokens?: number;

  @IsOptional()
  maxOutputTokens?: number;

  @IsOptional()
  @IsBoolean()
  allowPromptLogging?: boolean;

  @IsOptional()
  @IsBoolean()
  allowResponseLogging?: boolean;

  @IsOptional()
  retentionDays?: number;
}

class SetupBootstrapOpenWebUiDto {
  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  clientId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  applicationId?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apiKeyLabel?: string;

  @IsOptional()
  @IsBoolean()
  createApiKey?: boolean;

  @IsOptional()
  @IsBoolean()
  trustedForwardedIdentityEnabled?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  scopes?: string[];
}

export class SetupBootstrapRequestDto {
  @ValidateNested()
  @Type(() => SetupBootstrapSuperAdminDto)
  superAdmin!: SetupBootstrapSuperAdminDto;

  @ValidateNested()
  @Type(() => SetupBootstrapTenantDto)
  tenant!: SetupBootstrapTenantDto;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => SetupBootstrapProviderCredentialDto)
  providerCredentials?: SetupBootstrapProviderCredentialDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => SetupBootstrapTenantPolicyDto)
  tenantPolicy?: SetupBootstrapTenantPolicyDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SetupBootstrapOpenWebUiDto)
  openWebUi?: SetupBootstrapOpenWebUiDto;
}

