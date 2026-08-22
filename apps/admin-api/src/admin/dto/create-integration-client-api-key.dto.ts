import {
  IsArray,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
import {
  INTEGRATION_CLIENT_SCOPES,
  type IntegrationClientScope,
} from '@lxp/domain';

export class CreateIntegrationClientApiKeyDto {
  @IsString()
  @Length(1, 120)
  label!: string;

  @IsOptional()
  @IsArray()
  @IsIn(INTEGRATION_CLIENT_SCOPES, { each: true })
  scopes?: IntegrationClientScope[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
