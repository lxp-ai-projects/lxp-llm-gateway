import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { DataType, newDb } from 'pg-mem';

import { AddRegistrationVerificationChallenges1713000000019 } from './migrations/1713000000019-AddRegistrationVerificationChallenges';

test('registration verification migration creates and rolls back its schema', async () => {
  const db = newDb();
  db.public.registerFunction({
    name: 'version',
    returns: DataType.text,
    implementation: () => 'PostgreSQL 16.0',
  });
  db.public.registerFunction({
    name: 'current_database',
    returns: DataType.text,
    implementation: () => 'pg_mem_test',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [],
  });
  await dataSource.initialize();
  await dataSource.query(
    'CREATE TABLE "tenants" ("id" uuid NOT NULL, CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"))',
  );
  const runner = dataSource.createQueryRunner();
  const migration = new AddRegistrationVerificationChallenges1713000000019();

  await migration.up(runner);
  const columns = await dataSource.query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'registration_verification_challenges'`,
  );
  assert.deepEqual(
    columns.map((entry: { column_name: string }) => entry.column_name).sort(),
    [
      'attempt_count',
      'channel',
      'code_digest',
      'completion_token_digest',
      'completion_token_expires_at',
      'consumed_at',
      'created_at',
      'destination_hash',
      'expires_at',
      'id',
      'invalidated_at',
      'purpose',
      'resend_available_at',
      'resend_count',
      'tenant_id',
      'updated_at',
      'verified_at',
    ],
  );

  await migration.down(runner);
  const tables = await dataSource.query(
    `SELECT table_name FROM information_schema.tables WHERE table_name = 'registration_verification_challenges'`,
  );
  assert.equal(tables.length, 0);
  await runner.release();
  await dataSource.destroy();
});
