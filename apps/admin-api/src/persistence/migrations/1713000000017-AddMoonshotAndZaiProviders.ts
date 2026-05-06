import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMoonshotAndZaiProviders1713000000017
  implements MigrationInterface
{
  name = 'AddMoonshotAndZaiProviders1713000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES
        ('moonshot', 'Moonshot', 'active'),
        ('zai', 'Z.ai', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "providers"
      WHERE "provider_id" IN ('moonshot', 'zai')
    `);
  }
}
