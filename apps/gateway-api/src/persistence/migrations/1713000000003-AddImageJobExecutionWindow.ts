import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImageJobExecutionWindow1713000000003 implements MigrationInterface {
  name = 'AddImageJobExecutionWindow1713000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      ADD COLUMN "started_at" timestamptz,
      ADD COLUMN "completed_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "image_jobs"
      DROP COLUMN "completed_at",
      DROP COLUMN "started_at"
    `);
  }
}
