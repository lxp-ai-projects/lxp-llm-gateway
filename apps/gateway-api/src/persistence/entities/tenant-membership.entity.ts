import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import type { TenantRole } from '@lxp/domain';

import { TenantEntity } from './tenant.entity';
import { UserEntity } from './user.entity';

@Entity({ name: 'tenant_memberships' })
export class TenantMembershipEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 40 })
  role!: TenantRole;

  @ManyToOne(() => TenantEntity, (tenant) => tenant.memberships)
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;

  @ManyToOne(() => UserEntity, (user) => user.tenantMemberships)
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity;
}
