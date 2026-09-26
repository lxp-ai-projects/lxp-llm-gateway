import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserVideoProviderDefaults1713000000021 implements MigrationInterface {
  name = 'AddUserVideoProviderDefaults1713000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "default_video_provider_id" varchar(50),
      ADD COLUMN IF NOT EXISTS "default_video_model" varchar(150)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "default_video_model",
      DROP COLUMN IF EXISTS "default_video_provider_id"
    `);
  }
}
