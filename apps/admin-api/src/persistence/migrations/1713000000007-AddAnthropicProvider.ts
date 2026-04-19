import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnthropicProvider1713000000007 implements MigrationInterface {
  name = 'AddAnthropicProvider1713000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('anthropic', 'Anthropic Claude', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('anthropic')
    `);
  }
}
