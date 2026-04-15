import { IsIn, IsString, IsUUID, MinLength } from 'class-validator';

export class StoreProviderCredentialDto {
  @IsUUID()
  userUuid!: string;

  @IsIn(['nanogpt'])
  providerId!: 'nanogpt';

  @IsString()
  @MinLength(1)
  label!: string;

  @IsString()
  @MinLength(1)
  apiToken!: string;
}
