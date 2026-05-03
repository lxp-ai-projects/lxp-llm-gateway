import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantPolicies1713000000015 implements MigrationInterface {
  name = 'AddTenantPolicies1713000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenant_policies" (
        "tenant_id" uuid NOT NULL,
        "monthly_budget_usd" numeric(12,2),
        "daily_request_limit" integer,
        "monthly_request_limit" integer,
        "requests_per_minute" integer NOT NULL DEFAULT 60,
        "tokens_per_minute" integer NOT NULL DEFAULT 100000,
        "monthly_token_limit" integer,
        "image_requests_per_month" integer,
        "max_input_tokens" integer,
        "max_output_tokens" integer,
        "allow_prompt_logging" boolean NOT NULL DEFAULT false,
        "allow_response_logging" boolean NOT NULL DEFAULT false,
        "retention_days" integer NOT NULL DEFAULT 30,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenant_policies_tenant_id" PRIMARY KEY ("tenant_id"),
        CONSTRAINT "FK_tenant_policies_tenant" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "tenant_policies"
    `);
  }
}
