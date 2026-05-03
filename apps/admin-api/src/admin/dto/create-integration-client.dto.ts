import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

const SUPPORTED_INTEGRATION_CLIENT_SCOPES = [
  'chat:completion',
  'image:generate',
  'image:edit',
  'models:list',
] as const;

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
  defaultUserUuid?: string;

  @IsArray()
  @IsIn(SUPPORTED_INTEGRATION_CLIENT_SCOPES, { each: true })
  scopes!: Array<(typeof SUPPORTED_INTEGRATION_CLIENT_SCOPES)[number]>;

  @IsBoolean()
  trustedForwardedIdentityEnabled!: boolean;
}
