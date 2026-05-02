import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableTelemetryRowLevelSecurity1713000000007
  implements MigrationInterface
{
  name = 'EnableTelemetryRowLevelSecurity1713000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON "audit_logs"
    `);
    await queryRunner.query(`
      CREATE POLICY "audit_logs_tenant_isolation"
      ON "audit_logs"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE "usage_events" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "usage_events_tenant_isolation" ON "usage_events"
    `);
    await queryRunner.query(`
      CREATE POLICY "usage_events_tenant_isolation"
      ON "usage_events"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS "usage_events_tenant_isolation" ON "usage_events"
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events" DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "audit_logs_tenant_isolation" ON "audit_logs"
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "audit_logs" DISABLE ROW LEVEL SECURITY
    `);
  }
}
