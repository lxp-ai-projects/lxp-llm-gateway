import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageLabPersistence1713000000000
  implements MigrationInterface
{
  name = 'AddImageLabPersistence1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "image_assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "source_type" varchar(20) NOT NULL,
        "label" varchar(255),
        "mime_type" varchar(100),
        "data_url" text NOT NULL,
        "original_url" text,
        "is_saved" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_image_assets_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_assets_user_id_created_at"
      ON "image_assets" ("user_id", "created_at")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "image_jobs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "request_id" varchar(100) NOT NULL,
        "provider_id" varchar(50) NOT NULL,
        "model" varchar(150) NOT NULL,
        "prompt" text NOT NULL,
        "mode" varchar(20) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_image_jobs_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_jobs_user_id_created_at"
      ON "image_jobs" ("user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_image_jobs_request_id"
      ON "image_jobs" ("request_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "image_job_results" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "job_id" uuid NOT NULL,
        "asset_id" uuid NOT NULL,
        "result_index" integer NOT NULL,
        "revised_prompt" text,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_image_job_results_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ix_image_job_results_job_id_result_index"
      ON "image_job_results" ("job_id", "result_index")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_job_results_job_id_result_index"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "image_job_results"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_image_jobs_request_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_jobs_user_id_created_at"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "image_jobs"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_assets_user_id_created_at"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "image_assets"
    `);
  }
}
