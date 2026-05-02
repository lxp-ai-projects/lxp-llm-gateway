import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogsAndUsageEvents1713000000006
  implements MigrationInterface
{
  name = 'AddAuditLogsAndUsageEvents1713000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "user_uuid" uuid NOT NULL,
        "request_id" varchar(100) NOT NULL,
        "route" varchar(100) NOT NULL,
        "action" varchar(50) NOT NULL,
        "provider_id" varchar(50),
        "model" varchar(150),
        "identity_source" varchar(60) NOT NULL,
        "integration_client_id" varchar(100),
        "status" varchar(30) NOT NULL,
        "message_count" integer,
        "message_characters" integer,
        "latency_ms" integer,
        "error_code" varchar(100),
        "error_message" text,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_audit_logs_tenant_created_at"
      ON "audit_logs" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_audit_logs_request_id"
      ON "audit_logs" ("request_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "usage_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "user_uuid" uuid NOT NULL,
        "request_id" varchar(100) NOT NULL,
        "operation" varchar(50) NOT NULL,
        "provider_id" varchar(50) NOT NULL,
        "model" varchar(150) NOT NULL,
        "identity_source" varchar(60) NOT NULL,
        "integration_client_id" varchar(100),
        "status" varchar(30) NOT NULL,
        "prompt_tokens" integer,
        "completion_tokens" integer,
        "total_tokens" integer,
        "reasoning_tokens" integer,
        "image_count" integer,
        "cost_estimate_usd" numeric(12,6),
        "latency_ms" integer,
        "metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_usage_events_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_usage_events_tenant_created_at"
      ON "usage_events" ("tenant_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_usage_events_request_id"
      ON "usage_events" ("request_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_usage_events_request_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_usage_events_tenant_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "usage_events"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_audit_logs_request_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "ix_audit_logs_tenant_created_at"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);
  }
}
