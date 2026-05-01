import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableTechnicalClientRowLevelSecurity1713000000008
  implements MigrationInterface
{
  name = 'EnableTechnicalClientRowLevelSecurity1713000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "integration_clients" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "integration_clients" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "integration_clients_tenant_isolation" ON "integration_clients"
    `);
    await queryRunner.query(`
      CREATE POLICY "integration_clients_tenant_isolation"
      ON "integration_clients"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);

    await queryRunner.query(`
      ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "api_keys_lookup_or_tenant_isolation" ON "api_keys"
    `);
    await queryRunner.query(`
      CREATE POLICY "api_keys_lookup_or_tenant_isolation"
      ON "api_keys"
      USING (
        "key_hash" = NULLIF(current_setting('app.api_key_hash', true), '')
        OR "tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid
      )
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS "api_keys_lookup_or_tenant_isolation" ON "api_keys"
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "api_keys" DISABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "integration_clients_tenant_isolation" ON "integration_clients"
    `);
    await queryRunner.query(`
      ALTER TABLE "integration_clients" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "integration_clients" DISABLE ROW LEVEL SECURITY
    `);
  }
}
