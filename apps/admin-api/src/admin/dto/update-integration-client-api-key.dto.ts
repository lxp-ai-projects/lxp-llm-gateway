import {
  IsArray,
  IsDateString,
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

export class UpdateIntegrationClientApiKeyDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  label?: string;

  @IsOptional()
  @IsArray()
  @IsIn(SUPPORTED_INTEGRATION_CLIENT_SCOPES, { each: true })
  scopes?: Array<(typeof SUPPORTED_INTEGRATION_CLIENT_SCOPES)[number]>;

  @IsOptional()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
