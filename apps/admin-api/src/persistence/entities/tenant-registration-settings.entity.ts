import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenantEntity } from './tenant.entity';

@Entity({ name: 'tenant_registration_settings' })
@Index('ux_tenant_registration_settings_tenant', ['tenantId'], { unique: true })
export class TenantRegistrationSettingsEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  tenant!: TenantEntity;
}
