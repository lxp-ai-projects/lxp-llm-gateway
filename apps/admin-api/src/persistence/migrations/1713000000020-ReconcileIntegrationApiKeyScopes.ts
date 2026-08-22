import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReconcileIntegrationApiKeyScopes1713000000020 implements MigrationInterface {
  name = 'ReconcileIntegrationApiKeyScopes1713000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "api_keys" AS key
      SET "scopes" = CASE
        WHEN jsonb_array_length(key."scopes") = 0 THEN client."scopes"
        ELSE COALESCE(
          (
            SELECT jsonb_agg(scope.value ORDER BY scope.value)
            FROM jsonb_array_elements_text(key."scopes") AS scope(value)
            WHERE client."scopes" ? scope.value
          ),
          '[]'::jsonb
        )
      END
      FROM "integration_clients" AS client
      WHERE client."id" = key."integration_client_id"
    `);
  }

  public async down(): Promise<void> {
    // Historical scope values cannot be reconstructed safely.
  }
}
