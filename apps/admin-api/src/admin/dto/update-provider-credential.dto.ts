import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProviderCredentialDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apiToken?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  baseUrl?: string;
}
