import type { MigrationInterface, QueryRunner } from 'typeorm';

export class EnrichUsageLedger1713000000012 implements MigrationInterface {
  name = 'EnrichUsageLedger1713000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      ADD COLUMN IF NOT EXISTS "capability" character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      ADD COLUMN IF NOT EXISTS "credential_scope_used" character varying(20)
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      ADD COLUMN IF NOT EXISTS "error_code" character varying(60)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      DROP COLUMN IF EXISTS "error_code"
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      DROP COLUMN IF EXISTS "credential_scope_used"
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      DROP COLUMN IF EXISTS "capability"
    `);
  }
}
