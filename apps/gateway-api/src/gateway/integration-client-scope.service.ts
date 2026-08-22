import { ForbiddenException, Injectable } from '@nestjs/common';
import type { IntegrationClientScope } from '@lxp/domain';

import type { GatewayIntegrationClientAuthContext } from '../auth/auth.types';

@Injectable()
export class IntegrationClientScopeService {
  assertScope(
    authContext: GatewayIntegrationClientAuthContext,
    requiredScope: IntegrationClientScope,
  ): void {
    if (!authContext.integrationClientId) {
      return;
    }

    const grantedScopes = authContext.integrationClientScopes ?? [];
    if (grantedScopes.includes(requiredScope)) {
      return;
    }

    throw new ForbiddenException({
      statusCode: 403,
      code:
        requiredScope === 'evaluation:invoke'
          ? 'evaluation_service_forbidden'
          : 'integration_client_scope_forbidden',
      message: `Integration client "${authContext.integrationClientId}" is missing the required scope "${requiredScope}".`,
    });
  }
}
