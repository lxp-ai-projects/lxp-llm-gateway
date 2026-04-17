import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProviderCredentialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  apiToken?: string;
}
