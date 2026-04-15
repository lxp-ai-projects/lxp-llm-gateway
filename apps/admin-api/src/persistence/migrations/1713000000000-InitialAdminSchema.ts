import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialAdminSchema1713000000000 implements MigrationInterface {
  name = 'InitialAdminSchema1713000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

    await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "description" character varying(255) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_roles_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "providers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "provider_id" character varying(50) NOT NULL,
        "display_name" character varying(100) NOT NULL,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_providers_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_providers_provider_id" UNIQUE ("provider_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_uuid" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email_hash" character varying(64) NOT NULL,
        "encrypted_email" text NOT NULL,
        "email_iv" character varying(24) NOT NULL,
        "email_auth_tag" character varying(24) NOT NULL,
        "email_key_version" integer NOT NULL,
        "password_hash" text NOT NULL,
        "displayName" character varying(100) NOT NULL,
        "status" character varying(30) NOT NULL DEFAULT 'active',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_users_user_uuid" UNIQUE ("user_uuid"),
        CONSTRAINT "UX_users_email_hash" UNIQUE ("email_hash")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_roles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "role_id" uuid NOT NULL,
        CONSTRAINT "PK_user_roles_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_user_roles_user_role" UNIQUE ("user_id", "role_id"),
        CONSTRAINT "FK_user_roles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_roles_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "user_provider_credentials" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "provider_id" uuid NOT NULL,
        "label" character varying(100) NOT NULL,
        "encrypted_secret" text NOT NULL,
        "iv" character varying(24) NOT NULL,
        "auth_tag" character varying(24) NOT NULL,
        "key_version" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "masked_hint" character varying(20),
        "last_used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_provider_credentials_id" PRIMARY KEY ("id"),
        CONSTRAINT "UX_user_provider_credentials_active" UNIQUE ("user_id", "provider_id", "label"),
        CONSTRAINT "FK_user_provider_credentials_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_user_provider_credentials_provider" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      INSERT INTO "roles" ("name", "description")
      VALUES
        ('admin', 'Full control-plane administrator'),
        ('operator', 'Operational administrator'),
        ('user', 'Standard user')
    `);

    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('nanogpt', 'NanoGPT', 'active')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_provider_credentials"');
    await queryRunner.query('DROP TABLE "user_roles"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TABLE "providers"');
    await queryRunner.query('DROP TABLE "roles"');
  }
}
