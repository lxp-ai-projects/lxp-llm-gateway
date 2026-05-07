import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ProviderId } from '@lxp/domain';
import type { MediaGenerationStatus } from '@lxp/domain';

@Entity({ name: 'media_generation_jobs' })
@Index('ix_media_generation_jobs_user_id_created_at', ['userId', 'createdAt'])
@Index('ix_media_generation_jobs_status_created_at', ['status', 'createdAt'])
@Index('ux_media_generation_jobs_request_id', ['requestId'], { unique: true })
@Index('ux_media_generation_jobs_provider_job_id', ['providerId', 'providerJobId'], {
  unique: true,
  where: '"provider_job_id" IS NOT NULL',
})
@Index(
  'ux_media_generation_jobs_tenant_user_idempotency_key',
  ['tenantId', 'userId', 'idempotencyKey'],
  {
    unique: true,
    where: '"idempotency_key" IS NOT NULL',
  },
)
export class MediaGenerationJobEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: ProviderId;

  @Column({ type: 'varchar', length: 40 })
  capability!: 'video';

  @Column({ type: 'varchar', length: 40 })
  mode!: 'image_to_video' | 'text_to_video';

  @Column({ type: 'varchar', length: 150 })
  model!: string;

  @Column({ type: 'text' })
  prompt!: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status!: MediaGenerationStatus;

  @Column({ name: 'provider_job_id', type: 'varchar', length: 150, nullable: true })
  providerJobId!: string | null;

  @Column({ name: 'idempotency_key', type: 'varchar', length: 200, nullable: true })
  idempotencyKey!: string | null;

  @Column({ name: 'request_payload', type: 'jsonb' })
  requestPayload!: Record<string, unknown>;

  @Column({ name: 'source_asset_id', type: 'uuid', nullable: true })
  sourceAssetId!: string | null;

  @Column({ name: 'provider_metadata', type: 'jsonb', nullable: true })
  providerMetadata!: Record<string, unknown> | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'submission_attempts', type: 'integer', default: 0 })
  submissionAttempts!: number;

  @Column({ name: 'poll_attempts', type: 'integer', default: 0 })
  pollAttempts!: number;

  @Column({ name: 'next_poll_after', type: 'timestamptz', nullable: true })
  nextPollAfter!: Date | null;

  @Column({ name: 'last_polled_at', type: 'timestamptz', nullable: true })
  lastPolledAt!: Date | null;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
