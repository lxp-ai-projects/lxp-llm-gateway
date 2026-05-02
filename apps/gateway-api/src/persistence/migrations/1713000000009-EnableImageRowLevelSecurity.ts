import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableImageRowLevelSecurity1713000000009
  implements MigrationInterface
{
  name = 'EnableImageRowLevelSecurity1713000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_assets" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_assets" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_assets_tenant_isolation" ON "image_assets"
    `);
    await queryRunner.query(`
      CREATE POLICY "image_assets_tenant_isolation"
      ON "image_assets"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE "image_jobs" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_jobs_tenant_isolation" ON "image_jobs"
    `);
    await queryRunner.query(`
      CREATE POLICY "image_jobs_tenant_isolation"
      ON "image_jobs"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE "image_job_results" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_job_results_tenant_isolation" ON "image_job_results"
    `);
    await queryRunner.query(`
      CREATE POLICY "image_job_results_tenant_isolation"
      ON "image_job_results"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_job_results_tenant_isolation" ON "image_job_results"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_job_results" DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_jobs_tenant_isolation" ON "image_jobs"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_jobs" DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "image_assets_tenant_isolation" ON "image_assets"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_assets" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "image_assets" DISABLE ROW LEVEL SECURITY
    `);
  }
}
