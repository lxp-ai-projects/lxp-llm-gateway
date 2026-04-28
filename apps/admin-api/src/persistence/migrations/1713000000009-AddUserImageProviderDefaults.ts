import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserImageProviderDefaults1713000000009 implements MigrationInterface {
  name = 'AddUserImageProviderDefaults1713000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "default_image_provider_id" varchar(50),
      ADD COLUMN IF NOT EXISTS "default_image_model" varchar(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "default_image_model",
      DROP COLUMN IF EXISTS "default_image_provider_id"
    `);
  }
}
