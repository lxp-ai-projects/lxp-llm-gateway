import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type TenantModelAccessCapability =
  | 'text'
  | 'image'
  | 'stt'
  | 'tts'
  | 'embedding';

export type TenantModelAccessEffect = 'allow' | 'deny';

@Entity({ name: 'tenant_model_access_rules' })
@Index('ux_tenant_model_access_rules_tenant_provider_pattern_capability_priority', [
  'tenantId',
  'providerId',
  'modelPattern',
  'capability',
  'priority',
])
export class TenantModelAccessRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: string;

  @Column({ name: 'model_pattern', type: 'varchar', length: 200 })
  modelPattern!: string;

  @Column({ name: 'capability', type: 'varchar', length: 20 })
  capability!: TenantModelAccessCapability;

  @Column({ name: 'effect', type: 'varchar', length: 20 })
  effect!: TenantModelAccessEffect;

  @Column({ name: 'max_input_tokens', type: 'integer', nullable: true })
  maxInputTokens!: number | null;

  @Column({ name: 'max_output_tokens', type: 'integer', nullable: true })
  maxOutputTokens!: number | null;

  @Column({ name: 'max_images_per_request', type: 'integer', nullable: true })
  maxImagesPerRequest!: number | null;

  @Column({ name: 'max_resolution', type: 'varchar', length: 50, nullable: true })
  maxResolution!: string | null;

  @Column({ name: 'priority', type: 'integer', default: 100 })
  priority!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
