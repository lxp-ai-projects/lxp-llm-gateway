import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ApiKeyEntity } from './api-key.entity';
import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'integration_clients' })
@Index('ux_integration_clients_tenant_client_id', ['tenantId', 'clientId'], {
  unique: true,
})
export class IntegrationClientEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'client_id', type: 'varchar', length: 100 })
  clientId!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName!: string;

  @Column({ name: 'application_id', type: 'varchar', length: 100 })
  applicationId!: string;

  @Column({ name: 'default_user_id', type: 'uuid', nullable: true })
  defaultUserId!: string | null;

  @Column({ name: 'scopes', type: 'jsonb' })
  scopes!: string[];

  @Column({ name: 'trusted_forwarded_identity_enabled', type: 'boolean' })
  trustedForwardedIdentityEnabled!: boolean;

  @Column({ type: 'varchar', length: 30 })
  status!: 'active' | 'disabled';

  @ManyToOne(() => TenantEntity)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => UserEntity, { nullable: true })
  @JoinColumn({ name: 'default_user_id' })
  defaultUser!: UserEntity | null;

  @OneToMany(() => ApiKeyEntity, (apiKey) => apiKey.integrationClient)
  apiKeys!: ApiKeyEntity[];
}
