import { IsUUID } from 'class-validator';

export class SwitchActiveTenantDto {
  @IsUUID()
  tenantId!: string;
}
