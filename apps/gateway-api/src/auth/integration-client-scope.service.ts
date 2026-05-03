import { ForbiddenException, Injectable } from '@nestjs/common';

import type { GatewayAuthContext } from './auth.types';

export type IntegrationClientScope =
  | 'chat:completion'
  | 'image:generate'
  | 'image:edit'
  | 'models:list'
  | 'usage:read';

@Injectable()
export class IntegrationClientScopeService {
  assertScope(
    authContext: GatewayAuthContext,
    requiredScope: Exclude<IntegrationClientScope, 'usage:read'>,
  ): void {
    if (!authContext.integrationClientId) {
      return;
    }

    const grantedScopes = new Set(authContext.integrationClientScopes ?? []);
    if (grantedScopes.has(requiredScope)) {
      return;
    }

    throw new ForbiddenException(
      `Integration client ${authContext.integrationClientId} is missing the required scope ${requiredScope}.`,
    );
  }
}
