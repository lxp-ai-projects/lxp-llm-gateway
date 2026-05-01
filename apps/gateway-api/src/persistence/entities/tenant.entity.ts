import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
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

  @Column({ name: 'allow_user_credential_override', type: 'boolean' })
  allowUserCredentialOverride!: boolean;

  @Column({ type: 'varchar', length: 30 })
  status!: 'active' | 'disabled';

  @OneToMany(() => TenantMembershipEntity, (membership) => membership.tenant)
  memberships!: TenantMembershipEntity[];

  @OneToMany(
    () => UserProviderCredentialEntity,
    (credential) => credential.tenant,
  )
  providerCredentials!: UserProviderCredentialEntity[];
}
