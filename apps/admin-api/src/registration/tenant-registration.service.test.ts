import assert from 'node:assert/strict';
import test from 'node:test';

import { TenantRegistrationService } from './tenant-registration.service';

function createService({
  tenants,
  host,
}: {
  tenants: Array<{
    id: string;
    slug: string;
    displayName: string;
    status: 'active' | 'disabled';
  }>;
  host?: {
    hostname: string;
    enabled: boolean;
    tenant: {
      id: string;
      slug: string;
      displayName: string;
      status: 'active' | 'disabled';
    };
  } | null;
}) {
  const settings = new Map<string, { tenantId: string; enabled: boolean }>();
  return new TenantRegistrationService(
    { find: async () => tenants } as never,
    { findOne: async () => host ?? null } as never,
    {
      findOne: async ({ where }: { where: { tenantId: string } }) =>
        settings.get(where.tenantId) ?? null,
      create: (value: { tenantId: string; enabled: boolean }) => value,
      save: async (value: { tenantId: string; enabled: boolean }) => {
        settings.set(value.tenantId, value);
        return value;
      },
    } as never,
  );
}

test('TenantRegistrationService resolves the sole active tenant without a hostname', async () => {
  const service = createService({
    tenants: [
      {
        id: 'tenant-1',
        slug: 'one',
        displayName: 'Tenant One',
        status: 'active',
      },
    ],
  });
  process.env.LXP_REGISTRATION_ENABLED = 'true';
  assert.deepEqual(await service.resolvePublicContext(null), {
    registrationEnabled: false,
    tenant: { slug: 'one', displayName: 'Tenant One' },
  });
});

test('TenantRegistrationService never falls back when multiple active tenants are unresolved', async () => {
  const service = createService({
    tenants: [
      {
        id: 'tenant-1',
        slug: 'one',
        displayName: 'Tenant One',
        status: 'active',
      },
      {
        id: 'tenant-2',
        slug: 'two',
        displayName: 'Tenant Two',
        status: 'active',
      },
    ],
  });
  assert.deepEqual(await service.resolvePublicContext('unknown.example.com'), {
    registrationEnabled: false,
    tenant: null,
  });
});

test('TenantRegistrationService requires global and tenant registration settings', async () => {
  const tenant = {
    id: 'tenant-1',
    slug: 'one',
    displayName: 'Tenant One',
    status: 'active' as const,
  };
  const service = createService({
    tenants: [tenant],
    host: { hostname: 'one.example.com', enabled: true, tenant },
  });
  process.env.LXP_REGISTRATION_ENABLED = 'false';
  assert.equal(
    (await service.resolvePublicContext('one.example.com')).registrationEnabled,
    false,
  );
});
