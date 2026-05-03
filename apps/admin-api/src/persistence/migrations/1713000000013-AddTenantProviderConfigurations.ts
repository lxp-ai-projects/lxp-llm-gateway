import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantProviderConfigurations1713000000013
  implements MigrationInterface
{
  name = 'AddTenantProviderConfigurations1713000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_provider_configurations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT true,
        "default_text_model" character varying(200),
        "default_image_model" character varying(200),
        "credential_mode" character varying(30) NOT NULL DEFAULT 'hybrid',
        "prefer_user_credentials" boolean NOT NULL DEFAULT false,
        "allow_platform_fallback" boolean NOT NULL DEFAULT false,
        "allow_tenant_fallback" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_provider_configurations_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_provider_configurations_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_provider_configurations_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_tenant_provider_configurations_tenant_provider"
      ON "tenant_provider_configurations" ("tenant_id", "provider_id")
    `);

    await queryRunner.query(`
      INSERT INTO "tenant_provider_configurations" (
        "tenant_id",
        "provider_id",
        "enabled",
        "default_text_model",
        "default_image_model",
        "credential_mode",
        "prefer_user_credentials",
        "allow_platform_fallback",
        "allow_tenant_fallback"
      )
      SELECT
        tenants.id,
        providers.id,
        providers.status = 'active',
        NULL,
        NULL,
        CASE
          WHEN tenants.allow_user_credential_override THEN 'hybrid'
          ELSE 'tenant_byok'
        END,
        tenants.allow_user_credential_override,
        false,
        true
      FROM "tenants" tenants
      CROSS JOIN "providers" providers
      ON CONFLICT ("tenant_id", "provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "ux_tenant_provider_configurations_tenant_provider"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "tenant_provider_configurations"`,
    );
  }
}
