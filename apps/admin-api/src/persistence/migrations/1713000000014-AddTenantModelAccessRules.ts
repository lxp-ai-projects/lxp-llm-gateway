import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantModelAccessRules1713000000014
  implements MigrationInterface
{
  name = 'AddTenantModelAccessRules1713000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_model_access_rules" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "provider_id" character varying(50) NOT NULL,
        "model_pattern" character varying(200) NOT NULL,
        "capability" character varying(20) NOT NULL,
        "effect" character varying(20) NOT NULL,
        "max_input_tokens" integer,
        "max_output_tokens" integer,
        "max_images_per_request" integer,
        "max_resolution" character varying(50),
        "priority" integer NOT NULL DEFAULT 100,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_model_access_rules_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_model_access_rules_tenant"
          FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_tenant_model_access_rules_tenant_provider_pattern_capability_priority"
      ON "tenant_model_access_rules" (
        "tenant_id",
        "provider_id",
        "model_pattern",
        "capability",
        "priority"
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ux_tenant_model_access_rules_tenant_provider_pattern_capability_priority"
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenant_model_access_rules"
    `);
  }
}
