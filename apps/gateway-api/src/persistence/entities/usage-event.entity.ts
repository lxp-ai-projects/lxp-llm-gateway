import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { GatewayAuthIdentitySource } from '../../auth/auth.types';

export type UsageEventCapability =
  | 'text'
  | 'image'
  | 'video'
  | 'stt'
  | 'tts'
  | 'embedding';

export type UsageEventCredentialScopeUsed = 'platform' | 'tenant' | 'user';

export type UsageEventStatus =
  | 'success'
  | 'error'
  | 'reserved'
  | 'blocked_by_policy'
  | 'blocked_by_quota';

@Entity({ name: 'usage_events' })
@Index('ix_usage_events_tenant_created_at', ['tenantId', 'createdAt'])
@Index('ix_usage_events_request_id', ['requestId'])
export class UsageEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'user_uuid', type: 'uuid' })
  userUuid!: string;

  @Column({ name: 'request_id', type: 'varchar', length: 100 })
  requestId!: string;

  @Column({ name: 'operation', type: 'varchar', length: 50 })
  operation!:
    | 'chat'
    | 'image_generation'
    | 'image_edit'
    | 'video_generation_submit'
    | 'video_generation_poll'
    | 'video_generation_download'
    | 'video_generation_cancel';

  @Column({ name: 'capability', type: 'varchar', length: 20, nullable: true })
  capability!: UsageEventCapability | null;

  @Column({ name: 'provider_id', type: 'varchar', length: 50 })
  providerId!: string;

  @Column({ name: 'model', type: 'varchar', length: 150 })
  model!: string;

  @Column({ name: 'identity_source', type: 'varchar', length: 60 })
  identitySource!: GatewayAuthIdentitySource;

  @Column({ name: 'integration_client_id', type: 'varchar', length: 100, nullable: true })
  integrationClientId!: string | null;

  @Column({ name: 'api_key_id', type: 'uuid', nullable: true })
  apiKeyId!: string | null;

  @Column({
    name: 'credential_scope_used',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  credentialScopeUsed!: UsageEventCredentialScopeUsed | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: UsageEventStatus;

  @Column({ name: 'error_code', type: 'varchar', length: 60, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'prompt_tokens', type: 'integer', nullable: true })
  promptTokens!: number | null;

  @Column({ name: 'completion_tokens', type: 'integer', nullable: true })
  completionTokens!: number | null;

  @Column({ name: 'total_tokens', type: 'integer', nullable: true })
  totalTokens!: number | null;

  @Column({ name: 'reasoning_tokens', type: 'integer', nullable: true })
  reasoningTokens!: number | null;

  @Column({ name: 'image_count', type: 'integer', nullable: true })
  imageCount!: number | null;

  @Column({
    name: 'cost_estimate_usd',
    type: 'numeric',
    precision: 12,
    scale: 6,
    nullable: true,
  })
  costEstimateUsd!: string | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs!: number | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
