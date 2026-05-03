import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

import { TenantEntity } from './tenant.entity';

@Entity({ name: 'tenant_policies' })
@Index('ux_tenant_policies_tenant', ['tenantId'], { unique: true })
export class TenantPolicyEntity {
  @PrimaryColumn({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({
    name: 'monthly_budget_usd',
    type: 'numeric',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  monthlyBudgetUsd!: string | null;

  @Column({ name: 'daily_request_limit', type: 'integer', nullable: true })
  dailyRequestLimit!: number | null;

  @Column({ name: 'monthly_request_limit', type: 'integer', nullable: true })
  monthlyRequestLimit!: number | null;

  @Column({ name: 'requests_per_minute', type: 'integer', default: 60 })
  requestsPerMinute!: number;

  @Column({ name: 'tokens_per_minute', type: 'integer', default: 100000 })
  tokensPerMinute!: number;

  @Column({ name: 'monthly_token_limit', type: 'integer', nullable: true })
  monthlyTokenLimit!: number | null;

  @Column({ name: 'image_requests_per_month', type: 'integer', nullable: true })
  imageRequestsPerMonth!: number | null;

  @Column({ name: 'max_input_tokens', type: 'integer', nullable: true })
  maxInputTokens!: number | null;

  @Column({ name: 'max_output_tokens', type: 'integer', nullable: true })
  maxOutputTokens!: number | null;

  @Column({ name: 'allow_prompt_logging', type: 'boolean', default: false })
  allowPromptLogging!: boolean;

  @Column({ name: 'allow_response_logging', type: 'boolean', default: false })
  allowResponseLogging!: boolean;

  @Column({ name: 'retention_days', type: 'integer', default: 30 })
  retentionDays!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => TenantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: TenantEntity;
}
