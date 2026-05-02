import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantOwnershipToImages1713000000005
  implements MigrationInterface
{
  name = 'AddTenantOwnershipToImages1713000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tenantsTableExists = await queryRunner.hasTable('tenants');
    const usersTableExists = await queryRunner.hasTable('users');
    const hasLastActiveTenantColumn = usersTableExists
      ? await queryRunner.hasColumn('users', 'last_active_tenant_id')
      : false;

    if (!tenantsTableExists || !hasLastActiveTenantColumn) {
      throw new Error(
        'Gateway tenant ownership migration requires the admin multi-tenant foundation migration to run first.',
      );
    }

    await queryRunner.query(`
      ALTER TABLE "image_assets"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);

    await queryRunner.query(`
      UPDATE "image_assets"
      SET "tenant_id" = COALESCE(
        "users"."last_active_tenant_id",
        (
          SELECT "id"
          FROM "tenants"
          WHERE "slug" = 'lxp-internal'
          LIMIT 1
        )
      )
      FROM "users"
      WHERE "users"."id" = "image_assets"."user_id"
        AND "image_assets"."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "image_jobs"
      SET "tenant_id" = COALESCE(
        "users"."last_active_tenant_id",
        (
          SELECT "id"
          FROM "tenants"
          WHERE "slug" = 'lxp-internal'
          LIMIT 1
        )
      )
      FROM "users"
      WHERE "users"."id" = "image_jobs"."user_id"
        AND "image_jobs"."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "image_job_results"
      SET "tenant_id" = "image_jobs"."tenant_id"
      FROM "image_jobs"
      WHERE "image_jobs"."id" = "image_job_results"."job_id"
        AND "image_job_results"."tenant_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "image_assets"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_assets_tenant_user_created_at"
      ON "image_assets" ("tenant_id", "user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_jobs_tenant_user_created_at"
      ON "image_jobs" ("tenant_id", "user_id", "created_at")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_job_results_tenant_job_id"
      ON "image_job_results" ("tenant_id", "job_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_job_results_tenant_job_id"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_jobs_tenant_user_created_at"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_assets_tenant_user_created_at"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results"
      DROP COLUMN IF EXISTS "tenant_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      DROP COLUMN IF EXISTS "tenant_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_assets"
      DROP COLUMN IF EXISTS "tenant_id"
    `);
  }
}
