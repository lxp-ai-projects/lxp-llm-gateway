import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateTenantPublicHostDto {
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
