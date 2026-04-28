import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageAssetContentHash1713000000001
  implements MigrationInterface
{
  name = 'AddImageAssetContentHash1713000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_assets"
      ADD COLUMN IF NOT EXISTS "content_hash" varchar(64)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "ix_image_assets_user_id_source_type_content_hash"
      ON "image_assets" ("user_id", "source_type", "content_hash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "ix_image_assets_user_id_source_type_content_hash"
    `);
    await queryRunner.query(`
      ALTER TABLE "image_assets"
      DROP COLUMN IF EXISTS "content_hash"
    `);
  }
}
