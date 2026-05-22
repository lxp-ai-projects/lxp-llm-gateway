import type { MigrationInterface, QueryRunner } from 'typeorm';

const INSTALLATION_STATE_SINGLETON_ID = 'singleton';

export class AddInstallationState1713000000018
  implements MigrationInterface
{
  name = 'AddInstallationState1713000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "installation_state" (
        "id" varchar(20) PRIMARY KEY,
        "status" varchar(20) NOT NULL,
        "setup_started_at" timestamptz NULL,
        "setup_completed_at" timestamptz NULL,
        "completed_by_user_id" uuid NULL,
        "app_version" varchar(50) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$
      DECLARE has_super_admin boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM "user_roles" ur
          INNER JOIN "roles" r ON r."id" = ur."role_id"
          WHERE r."name" = 'super_admin'
        ) INTO has_super_admin;

        IF NOT EXISTS (
          SELECT 1
          FROM "installation_state"
          WHERE "id" = '${INSTALLATION_STATE_SINGLETON_ID}'
        ) THEN
          INSERT INTO "installation_state" (
            "id",
            "status",
            "setup_completed_at",
            "app_version"
          )
          VALUES (
            '${INSTALLATION_STATE_SINGLETON_ID}',
            CASE WHEN has_super_admin THEN 'COMPLETED' ELSE 'PENDING' END,
            CASE WHEN has_super_admin THEN now() ELSE NULL END,
            NULL
          );
        END IF;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "installation_state"`);
  }
}
