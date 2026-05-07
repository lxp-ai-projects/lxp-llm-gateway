import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaGenerationVideoFoundation1713000000013
  implements MigrationInterface
{
  name = 'AddMediaGenerationVideoFoundation1713000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "tenant_model_access_rules"
      ADD COLUMN IF NOT EXISTS "max_duration_seconds" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_policies"
      ADD COLUMN IF NOT EXISTS "video_requests_per_month" integer
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_policies"
      ADD COLUMN IF NOT EXISTS "max_concurrent_video_jobs" integer
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_generation_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "request_id" varchar(100) NOT NULL,
        "provider_id" varchar(50) NOT NULL,
        "capability" varchar(40) NOT NULL,
        "mode" varchar(40) NOT NULL,
        "model" varchar(150) NOT NULL,
        "prompt" text NOT NULL,
        "status" varchar(20) NOT NULL,
        "provider_job_id" varchar(150),
        "idempotency_key" varchar(200),
        "request_payload" jsonb NOT NULL,
        "source_asset_id" uuid,
        "provider_metadata" jsonb,
        "error_message" text,
        "submission_attempts" integer NOT NULL DEFAULT 0,
        "poll_attempts" integer NOT NULL DEFAULT 0,
        "next_poll_after" timestamptz,
        "last_polled_at" timestamptz,
        "started_at" timestamptz,
        "completed_at" timestamptz,
        "failed_at" timestamptz,
        "cancelled_at" timestamptz,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_generation_jobs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_media_generation_jobs_user_id_created_at"
      ON "media_generation_jobs" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_media_generation_jobs_status_created_at"
      ON "media_generation_jobs" ("status", "created_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_media_generation_jobs_request_id"
      ON "media_generation_jobs" ("request_id")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_media_generation_jobs_provider_job_id"
      ON "media_generation_jobs" ("provider_id", "provider_job_id")
      WHERE "provider_job_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_media_generation_jobs_tenant_user_idempotency_key"
      ON "media_generation_jobs" ("tenant_id", "user_id", "idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "media_assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "job_id" uuid,
        "kind" varchar(20) NOT NULL,
        "source_type" varchar(20) NOT NULL,
        "output_index" integer NOT NULL DEFAULT 0,
        "label" varchar(255),
        "mime_type" varchar(100),
        "storage_key" varchar(500) NOT NULL,
        "original_url" text,
        "byte_size" integer,
        "duration_seconds" numeric(10,3),
        "width" integer,
        "height" integer,
        "sha256" varchar(64),
        "is_saved" boolean NOT NULL DEFAULT false,
        "provider_metadata" jsonb,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_media_assets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_media_assets_user_id_created_at"
      ON "media_assets" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ix_media_assets_job_id_output_index"
      ON "media_assets" ("job_id", "output_index")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_media_assets_job_id_output_index"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_media_assets_user_id_created_at"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "media_assets"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_media_generation_jobs_tenant_user_idempotency_key"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_media_generation_jobs_provider_job_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_media_generation_jobs_request_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_media_generation_jobs_status_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_media_generation_jobs_user_id_created_at"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "media_generation_jobs"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_policies"
      DROP COLUMN IF EXISTS "max_concurrent_video_jobs"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_policies"
      DROP COLUMN IF EXISTS "video_requests_per_month"
    `);
    await queryRunner.query(`
      ALTER TABLE "tenant_model_access_rules"
      DROP COLUMN IF EXISTS "max_duration_seconds"
    `);
  }
}
