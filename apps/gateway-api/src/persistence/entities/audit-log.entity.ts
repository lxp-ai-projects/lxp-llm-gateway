import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { GatewayAuthIdentitySource } from '../../auth/auth.types';

@Entity({ name: 'audit_logs' })
@Index('ix_audit_logs_tenant_created_at', ['tenantId', 'createdAt'])
@Index('ix_audit_logs_request_id', ['requestId'])
export class AuditLogEntity {
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

  @Column({ name: 'route', type: 'varchar', length: 100 })
  route!: string;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action!: string;

  @Column({ name: 'provider_id', type: 'varchar', length: 50, nullable: true })
  providerId!: string | null;

  @Column({ name: 'model', type: 'varchar', length: 150, nullable: true })
  model!: string | null;

  @Column({ name: 'identity_source', type: 'varchar', length: 60 })
  identitySource!: GatewayAuthIdentitySource;

  @Column({ name: 'integration_client_id', type: 'varchar', length: 100, nullable: true })
  integrationClientId!: string | null;

  @Column({ name: 'status', type: 'varchar', length: 30 })
  status!: 'success' | 'failure';

  @Column({ name: 'message_count', type: 'integer', nullable: true })
  messageCount!: number | null;

  @Column({ name: 'message_characters', type: 'integer', nullable: true })
  messageCharacters!: number | null;

  @Column({ name: 'latency_ms', type: 'integer', nullable: true })
  latencyMs!: number | null;

  @Column({ name: 'error_code', type: 'varchar', length: 100, nullable: true })
  errorCode!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
