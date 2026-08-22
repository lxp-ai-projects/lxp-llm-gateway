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

export class CreateIntegrationClientDto {
  @IsString()
  @Length(1, 100)
  clientId!: string;

  @IsString()
  @Length(1, 120)
  displayName!: string;

  @IsString()
  @Length(1, 100)
  applicationId!: string;

  @IsOptional()
  @IsString()
  defaultUserUuid?: string | null;

  @IsArray()
  @IsIn(INTEGRATION_CLIENT_SCOPES, { each: true })
  scopes!: IntegrationClientScope[];

  @IsBoolean()
  trustedForwardedIdentityEnabled!: boolean;
}
