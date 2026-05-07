import { ForbiddenException, Injectable } from '@nestjs/common';

import type { GatewayAuthContext } from '../auth/auth.types';

export type IntegrationClientScope =
  | 'chat:completion'
  | 'image:generate'
  | 'image:edit'
  | 'video:generate'
  | 'models:list'
  | 'usage:read';

@Injectable()
export class IntegrationClientScopeService {
  assertScope(
    authContext: GatewayAuthContext,
    requiredScope: IntegrationClientScope,
  ): void {
    if (!authContext.integrationClientId) {
      return;
    }

    const grantedScopes = authContext.integrationClientScopes ?? [];
    if (grantedScopes.includes(requiredScope)) {
      return;
    }

    throw new ForbiddenException(
      `Integration client "${authContext.integrationClientId}" is missing the required scope "${requiredScope}".`,
    );
  }
}
