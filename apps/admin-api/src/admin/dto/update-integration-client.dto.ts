import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  INTEGRATION_CLIENT_SCOPES,
  type IntegrationClientScope,
} from '@lxp/domain';

export class UpdateIntegrationClientDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  applicationId?: string;

  @IsOptional()
  @IsString()
  defaultUserUuid?: string | null;

  @IsOptional()
  @IsArray()
  @IsIn(INTEGRATION_CLIENT_SCOPES, { each: true })
  scopes?: IntegrationClientScope[];

  @IsOptional()
  @IsBoolean()
  trustedForwardedIdentityEnabled?: boolean;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
