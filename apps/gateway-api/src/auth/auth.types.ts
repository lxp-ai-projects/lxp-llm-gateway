import type { GlobalRole, ProviderId, TenantRole } from '@lxp/domain';

export type GatewayAuthTokenPayload = {
  sub: string;
  userId: string;
  emailHash: string;
  activeTenantId: string;
  activeTenantSlug?: string;
  type: 'access' | 'refresh';
  roles: TenantRole[];
  globalRoles: GlobalRole[];
  sessionId: string;
  jti: string;
  iat: number;
  exp: number;
};

export type GatewayAuthIdentitySource =
  | 'access-token'
  | 'openai-compatible-default-user'
  | 'openai-compatible-trusted-header'
  | 'integration-client-default-user'
  | 'integration-client-trusted-header';

export type GatewayAuthContext = {
  userId: string;
  userUuid: string;
  emailHash: string;
  activeTenantId: string;
  activeTenantSlug: string;
  identitySource: GatewayAuthIdentitySource;
  roles: TenantRole[];
  globalRoles: GlobalRole[];
  integrationClientId?: string;
  integrationClientKeyId?: string;
  integrationClientScopes?: string[];
  defaultProviderId: ProviderId | null;
  defaultModel: string | null;
  defaultImageProviderId: ProviderId | null;
  defaultImageModel: string | null;
};
