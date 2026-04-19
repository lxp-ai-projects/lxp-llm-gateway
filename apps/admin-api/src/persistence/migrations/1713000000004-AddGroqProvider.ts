import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGroqProvider1713000000004 implements MigrationInterface {
  name = 'AddGroqProvider1713000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('groq', 'Groq', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('groq')
    `);
  }
}
