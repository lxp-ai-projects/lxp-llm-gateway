import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateTenantPublicHostDto {
  @IsString()
  @Length(1, 253)
  hostname!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
