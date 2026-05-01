import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenantMembershipEntity } from './tenant-membership.entity';
import { UserProviderCredentialEntity } from './user-provider-credential.entity';

@Entity({ name: 'tenants' })
export class TenantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_tenants_slug', { unique: true })
  @Column({ type: 'varchar', length: 80 })
  slug!: string;

  @Column({ name: 'display_name', type: 'varchar', length: 120 })
  displayName!: string;

  @Column({
    name: 'allow_user_credential_override',
    type: 'boolean',
    default: true,
  })
  allowUserCredentialOverride!: boolean;

  @Column({ type: 'varchar', length: 30, default: 'active' })
  status!: 'active' | 'disabled';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.tenant)
  memberships!: TenantMembershipEntity[];

  @OneToMany(
    () => UserProviderCredentialEntity,
    (credential) => credential.tenant,
  )
  providerCredentials!: UserProviderCredentialEntity[];
}
