import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'media_assets' })
@Index('ix_media_assets_user_id_created_at', ['userId', 'createdAt'])
@Index('ix_media_assets_job_id_output_index', ['jobId', 'outputIndex'], {
  unique: true,
})
export class MediaAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: true })
  jobId!: string | null;

  @Column({ name: 'kind', type: 'varchar', length: 20 })
  kind!: 'video';

  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType!: 'generated';

  @Column({ name: 'output_index', type: 'integer', default: 0 })
  outputIndex!: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  label!: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType!: string | null;

  @Column({ name: 'storage_key', type: 'varchar', length: 500 })
  storageKey!: string;

  @Column({ name: 'original_url', type: 'text', nullable: true })
  originalUrl!: string | null;

  @Column({ name: 'byte_size', type: 'integer', nullable: true })
  byteSize!: number | null;

  @Column({ name: 'duration_seconds', type: 'numeric', precision: 10, scale: 3, nullable: true })
  durationSeconds!: string | null;

  @Column({ name: 'width', type: 'integer', nullable: true })
  width!: number | null;

  @Column({ name: 'height', type: 'integer', nullable: true })
  height!: number | null;

  @Column({ name: 'sha256', type: 'varchar', length: 64, nullable: true })
  sha256!: string | null;

  @Column({ name: 'is_saved', type: 'boolean', default: false })
  isSaved!: boolean;

  @Column({ name: 'provider_metadata', type: 'jsonb', nullable: true })
  providerMetadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
