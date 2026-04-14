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

import { UserProviderCredentialEntity } from './user-provider-credential.entity';

@Entity({ name: 'providers' })
export class ProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_providers_provider_id', { unique: true })
  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: ProviderId;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ type: 'varchar', length: 30, default: 'active' })
  status!: 'active' | 'disabled';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(
    () => UserProviderCredentialEntity,
    (credential) => credential.provider,
  )
  credentials!: UserProviderCredentialEntity[];
}
