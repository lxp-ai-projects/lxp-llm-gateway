import { IsOptional, IsUUID } from 'class-validator';

export class TestTenantProviderConfigurationDto {
  @IsOptional()
  @IsUUID()
  userUuid?: string;
}
