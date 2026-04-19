import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleProvider1713000000008 implements MigrationInterface {
  name = 'AddGoogleProvider1713000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('google', 'Google Gemini', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('google')
    `);
  }
}
