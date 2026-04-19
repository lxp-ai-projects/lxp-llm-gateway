import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddXaiProvider1713000000005 implements MigrationInterface {
  name = 'AddXaiProvider1713000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('xai', 'xAI Grok', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('xai')
    `);
  }
}
