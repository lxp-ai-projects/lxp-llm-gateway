import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowServicePrincipalTelemetry1713000000015 implements MigrationInterface {
  name = 'AllowServicePrincipalTelemetry1713000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      ALTER COLUMN "user_id" DROP NOT NULL,
      ALTER COLUMN "user_uuid" DROP NOT NULL,
      ADD COLUMN IF NOT EXISTS "api_key_id" uuid
    `);
    await queryRunner.query(`
      ALTER TABLE "usage_events"
      ALTER COLUMN "user_id" DROP NOT NULL,
      ALTER COLUMN "user_uuid" DROP NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audit_logs"
      DROP COLUMN IF EXISTS "api_key_id"
    `);
    // Null service attribution cannot be collapsed back into a truthful user identity.
  }
}
