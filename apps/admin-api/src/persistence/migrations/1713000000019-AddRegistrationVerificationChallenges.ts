import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRegistrationVerificationChallenges1713000000019 implements MigrationInterface {
  name = 'AddRegistrationVerificationChallenges1713000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "registration_verification_challenges" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" uuid NOT NULL,
        "channel" varchar(16) NOT NULL,
        "destination_hash" varchar(64) NOT NULL,
        "code_digest" varchar(64) NOT NULL,
        "purpose" varchar(40) NOT NULL DEFAULT 'registration',
        "expires_at" TIMESTAMPTZ NOT NULL,
        "verified_at" TIMESTAMPTZ,
        "consumed_at" TIMESTAMPTZ,
        "invalidated_at" TIMESTAMPTZ,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "resend_count" integer NOT NULL DEFAULT 0,
        "resend_available_at" TIMESTAMPTZ NOT NULL,
        "completion_token_digest" varchar(64),
        "completion_token_expires_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_registration_verification_challenges_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_registration_verification_challenges_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(
      'CREATE INDEX "ix_registration_verification_challenges_tenant_destination" ON "registration_verification_challenges" ("tenant_id", "destination_hash")',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX "ix_registration_verification_challenges_tenant_destination"',
    );
    await queryRunner.query(
      'DROP TABLE "registration_verification_challenges"',
    );
  }
}
