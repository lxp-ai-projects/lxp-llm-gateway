import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';
import { PROVIDER_IDS } from '@lxp/domain';
import type { ProviderId } from '@lxp/domain';

export class CreateProviderCredentialDto {
  @IsOptional()
  @IsUUID()
  userUuid?: string;

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
  @IsString()
  @MinLength(1)
  baseUrl?: string;

  @IsOptional()
  @IsIn(['tenant', 'user'])
  scope?: 'tenant' | 'user';
}
