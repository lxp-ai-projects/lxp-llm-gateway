import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMistralAndDeepSeekProviders1713000000016
  implements MigrationInterface
{
  name = 'AddMistralAndDeepSeekProviders1713000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES
        ('mistral', 'Mistral', 'active'),
        ('deepseek', 'DeepSeek', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('mistral', 'deepseek')
    `);
  }
}
