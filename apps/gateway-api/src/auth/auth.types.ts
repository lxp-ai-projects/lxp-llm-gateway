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
  | 'integration-client-service'
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

export type GatewayServiceAuthContext = {
  userId: null;
  userUuid: null;
  emailHash: null;
  activeTenantId: string;
  activeTenantSlug: string;
  identitySource: 'integration-client-service';
  roles: [];
  globalRoles: [];
  integrationClientId: string;
  integrationClientKeyId: string;
  integrationClientScopes: string[];
  defaultProviderId: null;
  defaultModel: null;
  defaultImageProviderId: null;
  defaultImageModel: null;
};

export type GatewayIntegrationClientAuthContext =
  | GatewayAuthContext
  | GatewayServiceAuthContext;
