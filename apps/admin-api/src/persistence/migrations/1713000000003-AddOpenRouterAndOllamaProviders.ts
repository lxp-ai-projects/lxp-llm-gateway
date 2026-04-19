import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOpenRouterAndOllamaProviders1713000000003
  implements MigrationInterface
{
  name = 'AddOpenRouterAndOllamaProviders1713000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES
        ('openrouter', 'OpenRouter', 'active'),
        ('ollama', 'Ollama', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('openrouter', 'ollama')
    `);
  }
}
