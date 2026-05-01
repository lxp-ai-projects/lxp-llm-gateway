import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIntegrationClientsAndApiKeys1713000000011
  implements MigrationInterface
{
  name = 'AddIntegrationClientsAndApiKeys1713000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "integration_clients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "client_id" character varying(100) NOT NULL,
        "display_name" character varying(120) NOT NULL,
        "application_id" character varying(100) NOT NULL,
        "default_user_id" uuid,
        "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "trusted_forwarded_identity_enabled" boolean NOT NULL DEFAULT false,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_integration_clients_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_integration_clients_tenant_client_id" UNIQUE ("tenant_id", "client_id"),
        CONSTRAINT "FK_integration_clients_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_integration_clients_default_user" FOREIGN KEY ("default_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "integration_client_id" uuid NOT NULL,
        "label" character varying(120) NOT NULL,
        "key_hash" character varying(64) NOT NULL,
        "key_hint" character varying(20),
        "scopes" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "expires_at" TIMESTAMP WITH TIME ZONE,
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_api_keys_key_hash" UNIQUE ("key_hash"),
        CONSTRAINT "FK_api_keys_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_api_keys_integration_client" FOREIGN KEY ("integration_client_id") REFERENCES "integration_clients"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "integration_clients"`);
  }
}
