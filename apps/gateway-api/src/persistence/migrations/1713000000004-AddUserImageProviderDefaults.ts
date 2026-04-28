import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserImageProviderDefaults1713000000004 implements MigrationInterface {
  name = 'AddUserImageProviderDefaults1713000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "default_image_provider_id" varchar(50),
      ADD COLUMN "default_image_model" varchar(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "default_image_model",
      DROP COLUMN "default_image_provider_id"
    `);
  }
}
