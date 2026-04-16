import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateProviderCredentialDto {
  @IsOptional()
  @IsUUID()
  userUuid?: string;

  @IsIn(['nanogpt'])
  providerId!: 'nanogpt';

  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  apiToken!: string;
}
