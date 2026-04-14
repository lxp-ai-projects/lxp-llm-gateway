import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { DataType, newDb } from 'pg-mem';

import { ProviderEntity } from './entities/provider.entity';
import { RoleEntity } from './entities/role.entity';
import { UserEntity } from './entities/user.entity';
import { UserProviderCredentialEntity } from './entities/user-provider-credential.entity';
import { UserRoleEntity } from './entities/user-role.entity';

test('database entity graph initializes against a Postgres-compatible in-memory database', async () => {
  const db = newDb({
    autoCreateForeignKeyIndices: true,
  });
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
    name: 'current_schema',
    returns: DataType.text,
    implementation: () => 'public',
  });
  db.public.registerFunction({
    name: 'uuid_generate_v4',
    returns: DataType.uuid,
    implementation: () => randomUUID(),
  });
  const dataSource = await db.adapters.createTypeormDataSource({
    type: 'postgres',
    entities: [
      UserEntity,
      RoleEntity,
      UserRoleEntity,
      ProviderEntity,
      UserProviderCredentialEntity,
    ],
    synchronize: true,
  });

  await dataSource.initialize();

  const providerRepository = dataSource.getRepository(ProviderEntity);
  const provider = providerRepository.create({
    providerId: 'nanogpt',
    displayName: 'NanoGPT',
    status: 'active',
  });
  await providerRepository.save(provider);

  const providers = await providerRepository.find();
  assert.equal(providers.length, 1);
  assert.equal(providers[0]?.providerId, 'nanogpt');

  const roleRepository = dataSource.getRepository(RoleEntity);
  const role = roleRepository.create({
    name: 'admin',
    description: 'Administrator',
  });
  await roleRepository.save(role);
  assert.ok(role.id);

  await dataSource.destroy();
});
