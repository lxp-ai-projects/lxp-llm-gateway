import { Column, Entity, Index, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import type { ProviderId } from '@lxp/domain';

import { TenantMembershipEntity } from './tenant-membership.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_users_user_uuid', { unique: true })
  @Column({ name: 'user_uuid', type: 'uuid' })
  userUuid!: string;

  @Index('ux_users_email_hash', { unique: true })
  @Column({ name: 'email_hash', type: 'varchar', length: 64 })
  emailHash!: string;

  @Column({ name: 'last_active_tenant_id', type: 'uuid', nullable: true })
  lastActiveTenantId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  status!: 'active' | 'disabled';

  @Column({
    name: 'default_provider_id',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  defaultProviderId!: ProviderId | null;

  @Column({
    name: 'default_model',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  defaultModel!: string | null;

  @Column({
    name: 'default_image_provider_id',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  defaultImageProviderId!: ProviderId | null;

  @Column({
    name: 'default_image_model',
    type: 'varchar',
    length: 150,
    nullable: true,
  })
  defaultImageModel!: string | null;

  @OneToMany(
    () => TenantMembershipEntity,
    (membership) => membership.user,
  )
  tenantMemberships!: TenantMembershipEntity[];
}
