import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import type { ProviderId } from '@lxp/domain';

@Entity({ name: 'providers' })
export class ProviderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('ux_providers_provider_id', { unique: true })
  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: ProviderId;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName!: string;

  @Column({ type: 'varchar', length: 30 })
  status!: 'active' | 'disabled';
}
