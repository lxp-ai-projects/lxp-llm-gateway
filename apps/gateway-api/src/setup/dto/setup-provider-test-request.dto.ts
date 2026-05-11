import { ProviderId, SUPPORTED_PROVIDERS } from '@lxp/domain';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const SUPPORTED_PROVIDER_IDS = SUPPORTED_PROVIDERS.map(
  (provider) => provider.providerId,
);

export class SetupProviderTestRequestDto {
  @IsString()
  @IsIn(SUPPORTED_PROVIDER_IDS)
  providerId!: ProviderId;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  apiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  baseUrl?: string;
}
