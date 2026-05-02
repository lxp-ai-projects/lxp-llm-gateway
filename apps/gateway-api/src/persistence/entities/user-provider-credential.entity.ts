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
import { UserEntity } from './user.entity';

@Entity({ name: 'user_provider_credentials' })
@Index(
  'ux_user_provider_credentials_active',
  ['tenantId', 'userId', 'providerId', 'label'],
  {
    unique: true,
  },
)
export class UserProviderCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ name: 'provider_id', type: 'uuid' })
  providerId!: string;

  @Column({ type: 'varchar', length: 20 })
  scope!: 'tenant' | 'user';

  @Column({ type: 'varchar', length: 100 })
  label!: string;

  @Column({ name: 'encrypted_secret', type: 'text' })
  encryptedSecret!: string;

  @Column({ type: 'varchar', length: 24 })
  iv!: string;

  @Column({ name: 'auth_tag', type: 'varchar', length: 24 })
  authTag!: string;

  @Column({ name: 'key_version', type: 'integer' })
  keyVersion!: number;

  @Column({ name: 'is_active', type: 'boolean' })
  isActive!: boolean;

  @Column({ name: 'masked_hint', type: 'varchar', length: 20, nullable: true })
  maskedHint!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => UserEntity, {
    nullable: true,
  })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.providerCredentials)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => ProviderEntity)
  @JoinColumn({ name: 'provider_id' })
  provider!: ProviderEntity;
}
