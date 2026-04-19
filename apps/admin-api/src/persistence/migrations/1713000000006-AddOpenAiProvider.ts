import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenAiProvider1713000000006 implements MigrationInterface {
  name = 'AddOpenAiProvider1713000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('openai', 'OpenAI', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('openai')
    `);
  }
}
