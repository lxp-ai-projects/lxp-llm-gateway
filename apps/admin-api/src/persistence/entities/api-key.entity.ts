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

import { IntegrationClientEntity } from './integration-client.entity';
import { TenantEntity } from './tenant.entity';

@Entity({ name: 'api_keys' })
@Index('ux_api_keys_key_hash', ['keyHash'], { unique: true })
export class ApiKeyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'integration_client_id', type: 'uuid' })
  integrationClientId!: string;

  @Column({ name: 'label', type: 'varchar', length: 120 })
  label!: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 64 })
  keyHash!: string;

  @Column({ name: 'key_hint', type: 'varchar', length: 20, nullable: true })
  keyHint!: string | null;

  @Column({ name: 'scopes', type: 'jsonb', default: () => "'[]'::jsonb" })
  scopes!: string[];

  @Column({ type: 'varchar', length: 30, default: 'active' })
  status!: 'active' | 'disabled';

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(
    () => IntegrationClientEntity,
    (integrationClient) => integrationClient.apiKeys,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn({ name: 'integration_client_id' })
  integrationClient!: IntegrationClientEntity;
}
