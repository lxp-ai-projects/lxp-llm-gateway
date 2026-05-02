import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnableByokCredentialRowLevelSecurity1713000000010
  implements MigrationInterface
{
  name = 'EnableByokCredentialRowLevelSecurity1713000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials" ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials" FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      DROP POLICY IF EXISTS "user_provider_credentials_tenant_isolation" ON "user_provider_credentials"
    `);
    await queryRunner.query(`
      CREATE POLICY "user_provider_credentials_tenant_isolation"
      ON "user_provider_credentials"
      USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP POLICY IF EXISTS "user_provider_credentials_tenant_isolation" ON "user_provider_credentials"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials" NO FORCE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials" DISABLE ROW LEVEL SECURITY
    `);
  }
}
