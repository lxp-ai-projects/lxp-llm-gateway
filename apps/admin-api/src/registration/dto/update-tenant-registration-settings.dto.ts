import { IsBoolean } from 'class-validator';

export class UpdateTenantRegistrationSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}
