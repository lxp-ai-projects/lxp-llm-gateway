import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProviderId } from '@lxp/domain';

import { TenantMembershipEntity } from './tenant-membership.entity';
import { UserProviderCredentialEntity } from './user-provider-credential.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_users_user_uuid', { unique: true })
  @Column({
    name: 'user_uuid',
    type: 'uuid',
    default: () => 'uuid_generate_v4()',
  })
  userUuid!: string;

  @Index('ux_users_email_hash', { unique: true })
  @Column({ name: 'email_hash', type: 'varchar', length: 64 })
  emailHash!: string;

  @Column({ name: 'last_active_tenant_id', type: 'uuid', nullable: true })
  lastActiveTenantId!: string | null;

  @Column({ name: 'encrypted_email', type: 'text' })
  encryptedEmail!: string;

  @Column({ name: 'email_iv', type: 'varchar', length: 24 })
  emailIv!: string;

  @Column({ name: 'email_auth_tag', type: 'varchar', length: 24 })
  emailAuthTag!: string;

  @Column({ name: 'email_key_version', type: 'integer' })
  emailKeyVersion!: number;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ type: 'varchar', length: 30, default: 'active' })
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
  roles!: UserRoleEntity[];

  @OneToMany(
    () => TenantMembershipEntity,
    (membership) => membership.user,
  )
  tenantMemberships!: TenantMembershipEntity[];

  @OneToMany(
    () => UserProviderCredentialEntity,
    (credential) => credential.user,
  )
  providerCredentials!: UserProviderCredentialEntity[];
}
