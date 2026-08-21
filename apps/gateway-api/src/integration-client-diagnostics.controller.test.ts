import assert from 'node:assert/strict';
import test from 'node:test';

import { IntegrationClientDiagnosticsController } from './integration-client-diagnostics.controller';

test('self-test returns only the authenticated integration identity', async () => {
  const authContext = {
    identitySource: 'integration-client-service',
    activeTenantId: 'tenant-1',
    integrationClientId: 'pgs',
    integrationClientScopes: ['models:list', 'evaluation:invoke'],
  };
  const auth = {
    authenticateIntegrationClientRequest: async () => authContext,
  };
  const controller = new IntegrationClientDiagnosticsController(auth as never);

  const result = await controller.selfTest('Bearer secret', {
    headers: { 'x-lxp-expected-tenant-id': 'tenant-1' },
  } as never);

  assert.deepEqual(result, {
    status: 'ok',
    principalKind: 'SERVICE',
    identitySource: 'integration-client-service',
    tenantId: 'tenant-1',
    clientId: 'pgs',
    scopes: ['evaluation:invoke', 'models:list'],
  });
  assert.equal(JSON.stringify(result).includes('secret'), false);
});
