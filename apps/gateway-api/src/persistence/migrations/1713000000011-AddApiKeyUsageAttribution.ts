import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyUsageAttribution1713000000011
  implements MigrationInterface
{
  name = 'AddApiKeyUsageAttribution1713000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      ADD COLUMN IF NOT EXISTS "api_key_id" uuid
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      DROP COLUMN IF EXISTS "api_key_id"
    `);
  }
}
