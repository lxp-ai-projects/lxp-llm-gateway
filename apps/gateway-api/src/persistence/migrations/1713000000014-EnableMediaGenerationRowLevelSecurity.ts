import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableMediaGenerationRowLevelSecurity1713000000014
  implements MigrationInterface
{
  name = 'EnableMediaGenerationRowLevelSecurity1713000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "media_generation_jobs" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "media_generation_jobs" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "media_generation_jobs_tenant_isolation" ON "media_generation_jobs"
    `);
    await queryRunner.query(`
      CREATE POLICY "media_generation_jobs_tenant_isolation"
      ON "media_generation_jobs"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE "media_assets" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "media_assets_tenant_isolation" ON "media_assets"
    `);
    await queryRunner.query(`
      CREATE POLICY "media_assets_tenant_isolation"
      ON "media_assets"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS "media_assets_tenant_isolation" ON "media_assets"
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "media_assets" DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "media_generation_jobs_tenant_isolation" ON "media_generation_jobs"
    `);
    await queryRunner.query(`
      ALTER TABLE "media_generation_jobs" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "media_generation_jobs" DISABLE ROW LEVEL SECURITY
    `);
  }
}
