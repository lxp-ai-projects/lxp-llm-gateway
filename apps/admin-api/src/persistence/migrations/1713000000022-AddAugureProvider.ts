import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAugureProvider1713000000022 implements MigrationInterface {
  name = 'AddAugureProvider1713000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "providers" ("provider_id", "display_name", "status")
      VALUES ('augure', 'Augure', 'active')
      ON CONFLICT ("provider_id") DO NOTHING
    `);
  }

  public async down(): Promise<void> {
    return;
  }
}
