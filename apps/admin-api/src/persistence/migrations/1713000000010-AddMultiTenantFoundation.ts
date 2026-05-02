import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiTenantFoundation1713000000010
  implements MigrationInterface
{
  name = 'AddMultiTenantFoundation1713000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "slug" character varying(80) NOT NULL,
        "display_name" character varying(120) NOT NULL,
        "allow_user_credential_override" boolean NOT NULL DEFAULT true,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_tenants_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "tenants" ("slug", "display_name", "allow_user_credential_override", "status")
      VALUES ('lxp-internal', 'LXP Internal', true, 'active')
      ON CONFLICT ("slug") DO NOTHING
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_memberships" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" character varying(40) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_memberships_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_tenant_memberships_tenant_user_role" UNIQUE ("tenant_id", "user_id", "role"),
        CONSTRAINT "FK_tenant_memberships_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_tenant_memberships_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "last_active_tenant_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      ADD COLUMN IF NOT EXISTS "tenant_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      ADD COLUMN IF NOT EXISTS "scope" character varying(20) NOT NULL DEFAULT 'user'
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      ALTER COLUMN "user_id" DROP NOT NULL
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "last_active_tenant_id" = (
        SELECT "id"
        FROM "tenants"
        WHERE "slug" = 'lxp-internal'
        LIMIT 1
      )
      WHERE "last_active_tenant_id" IS NULL
    `);

    await queryRunner.query(`
      INSERT INTO "tenant_memberships" ("tenant_id", "user_id", "role")
      SELECT
        tenant.id,
        ur.user_id,
        CASE r.name
          WHEN 'admin' THEN 'tenant_admin'
          WHEN 'operator' THEN 'operator'
          ELSE 'user'
        END
      FROM "user_roles" ur
      INNER JOIN "roles" r ON r.id = ur.role_id
      CROSS JOIN (
        SELECT "id"
        FROM "tenants"
        WHERE "slug" = 'lxp-internal'
        LIMIT 1
      ) tenant
      WHERE r.name IN ('admin', 'operator', 'user')
      ON CONFLICT ("tenant_id", "user_id", "role") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description")
      VALUES ('super_admin', 'Global control-plane administrator')
      ON CONFLICT ("name") DO NOTHING
    `);

    await queryRunner.query(`
      UPDATE "user_provider_credentials"
      SET "tenant_id" = COALESCE(
        "user_provider_credentials"."tenant_id",
        "users"."last_active_tenant_id",
        (
          SELECT "id"
          FROM "tenants"
          WHERE "slug" = 'lxp-internal'
          LIMIT 1
        )
      )
      FROM "users"
      WHERE "users"."id" = "user_provider_credentials"."user_id"
    `);

    await queryRunner.query(`
      UPDATE "user_provider_credentials"
      SET "tenant_id" = (
        SELECT "id"
        FROM "tenants"
        WHERE "slug" = 'lxp-internal'
        LIMIT 1
      )
      WHERE "tenant_id" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      ALTER COLUMN "tenant_id" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      ADD CONSTRAINT "FK_user_provider_credentials_tenant"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      DROP CONSTRAINT IF EXISTS "UX_user_provider_credentials_active"
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_user_provider_credentials_user_scope"
      ON "user_provider_credentials" ("tenant_id", "user_id", "provider_id", "label")
      WHERE "scope" = 'user'
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_user_provider_credentials_tenant_scope"
      ON "user_provider_credentials" ("tenant_id", "provider_id", "label")
      WHERE "scope" = 'tenant'
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
      ALTER TABLE "user_provider_credentials"
      DROP CONSTRAINT IF EXISTS "FK_user_provider_credentials_tenant"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      DROP COLUMN IF EXISTS "scope"
    `);
    await queryRunner.query(`
      ALTER TABLE "user_provider_credentials"
      DROP COLUMN IF EXISTS "tenant_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "last_active_tenant_id"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenant_memberships"
    `);
    await queryRunner.query(`
      DELETE FROM "roles" WHERE "name" = 'super_admin'
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenants"
    `);
  }
}
