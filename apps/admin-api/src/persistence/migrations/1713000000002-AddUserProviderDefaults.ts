import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProviderDefaults1713000000002 implements MigrationInterface {
  name = 'AddUserProviderDefaults1713000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "default_provider_id" character varying(50)
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "default_model" character varying(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "default_model"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "default_provider_id"
    `);
  }
}
