import type { MigrationInterface, QueryRunner } from 'typeorm';

export class HardenProviderCredentialUniqueness1713000000012
  implements MigrationInterface
{
  name = 'HardenProviderCredentialUniqueness1713000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_user_provider_credentials_user_scope"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_user_provider_credentials_tenant_scope"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_user_provider_credentials_active"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_user_provider_credentials_user_scope"
      ON "user_provider_credentials" ("tenant_id", "user_id", "provider_id", "label")
      WHERE "scope" = 'user' AND "user_id" IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_user_provider_credentials_tenant_scope"
      ON "user_provider_credentials" ("tenant_id", "provider_id", "label")
      WHERE "scope" = 'tenant' AND "user_id" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_user_provider_credentials_tenant_scope"
    `);
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_user_provider_credentials_user_scope"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_user_provider_credentials_user_scope"
      ON "user_provider_credentials" ("tenant_id", "user_id", "provider_id", "label")
      WHERE "scope" = 'user'
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX "ux_user_provider_credentials_tenant_scope"
      ON "user_provider_credentials" ("tenant_id", "provider_id", "label")
      WHERE "scope" = 'tenant'
    `);
  }
}
