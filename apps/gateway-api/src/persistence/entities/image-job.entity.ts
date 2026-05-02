import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { ProviderId } from '@lxp/domain';

@Entity({ name: 'image_jobs' })
@Index('ix_image_jobs_user_id_created_at', ['userId', 'createdAt'])
export class ImageJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Index('ux_image_jobs_request_id', { unique: true })
  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: ProviderId;

  @Column({ type: 'varchar', length: 150 })
  model!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ type: 'varchar', length: 20 })
  mode!: 'generation' | 'edit';

  @Column({ name: 'provider_metadata', type: 'jsonb', nullable: true })
  providerMetadata!: Record<string, unknown> | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
