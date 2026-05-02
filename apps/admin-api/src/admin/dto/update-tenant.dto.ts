import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateTenantDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  displayName?: string;

  @IsOptional()
  @IsBoolean()
  allowUserCredentialOverride?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: 'active' | 'disabled';
}
