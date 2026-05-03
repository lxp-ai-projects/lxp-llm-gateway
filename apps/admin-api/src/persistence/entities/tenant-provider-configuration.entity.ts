import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ProviderEntity } from './provider.entity';
import { TenantEntity } from './tenant.entity';

export type TenantProviderCredentialMode =
  | 'platform_default'
  | 'tenant_byok'
  | 'user_byok'
  | 'hybrid';

@Entity({ name: 'tenant_provider_configurations' })
@Index(
  'ux_tenant_provider_configurations_tenant_provider',
  ['tenantId', 'providerId'],
  {
    unique: true,
  },
)
export class TenantProviderConfigurationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ type: 'boolean', default: true })
  enabled!: boolean;

  @Column({
    name: 'default_text_model',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  defaultTextModel!: string | null;

  @Column({
    name: 'default_image_model',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  defaultImageModel!: string | null;

  @Column({
    name: 'credential_mode',
    type: 'varchar',
    length: 30,
    default: 'hybrid',
  })
  credentialMode!: TenantProviderCredentialMode;

  @Column({ name: 'prefer_user_credentials', type: 'boolean', default: false })
  preferUserCredentials!: boolean;

  @Column({ name: 'allow_platform_fallback', type: 'boolean', default: false })
  allowPlatformFallback!: boolean;

  @Column({ name: 'allow_tenant_fallback', type: 'boolean', default: true })
  allowTenantFallback!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => ProviderEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider!: ProviderEntity;
}
