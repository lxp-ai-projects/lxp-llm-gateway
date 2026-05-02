import { IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @Length(3, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;

  @IsString()
  @Length(2, 120)
  displayName!: string;

  @IsOptional()
  @IsBoolean()
  allowUserCredentialOverride?: boolean;
}
