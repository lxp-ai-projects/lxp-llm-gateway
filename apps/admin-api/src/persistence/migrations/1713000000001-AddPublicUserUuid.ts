import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPublicUserUuid1713000000001 implements MigrationInterface {
  name = 'AddPublicUserUuid1713000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "user_uuid" uuid DEFAULT uuid_generate_v4()
    `);
    await queryRunner.query(`
      UPDATE "users"
      SET "user_uuid" = uuid_generate_v4()
      WHERE "user_uuid" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "user_uuid" SET NOT NULL
    `);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'UX_users_user_uuid'
        ) THEN
          ALTER TABLE "users"
          ADD CONSTRAINT "UX_users_user_uuid" UNIQUE ("user_uuid");
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP CONSTRAINT IF EXISTS "UX_users_user_uuid"
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "user_uuid"
    `);
  }
}
