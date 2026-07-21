import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantRegistrationFoundation1713000000018
  implements MigrationInterface
{
  name = 'AddTenantRegistrationFoundation1713000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "tenant_public_hosts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "hostname" varchar(253) NOT NULL,
        "is_primary" boolean NOT NULL DEFAULT false,
        "enabled" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_public_hosts_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tenant_public_hosts_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_tenant_public_hosts_hostname" UNIQUE ("hostname")
      )
    `);
    await queryRunner.query('CREATE INDEX "ix_tenant_public_hosts_tenant_id" ON "tenant_public_hosts" ("tenant_id")');
    await queryRunner.query(`
      CREATE TABLE "tenant_registration_settings" (
        "tenant_id" uuid NOT NULL,
        "enabled" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_registration_settings_tenant_id" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_registration_settings_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      INSERT INTO "tenant_registration_settings" ("tenant_id", "enabled")
      SELECT "id", false FROM "tenants"
      ON CONFLICT ("tenant_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "tenant_registration_settings"');
    await queryRunner.query('DROP INDEX "ix_tenant_public_hosts_tenant_id"');
    await queryRunner.query('DROP TABLE "tenant_public_hosts"');
  }
}
