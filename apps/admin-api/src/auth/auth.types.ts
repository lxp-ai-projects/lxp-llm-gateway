import type { GlobalRole, TenantRole } from '@lxp/domain';

export type TokenType = 'access' | 'refresh';

export type AuthTokenPayload = {
  sub: string;
  userId: string;
  emailHash: string;
  activeTenantId: string;
  activeTenantSlug?: string;
  type: TokenType;
  roles: TenantRole[];
  globalRoles: GlobalRole[];
  sessionId: string;
  jti: string;
};

export type AuthenticatedUser = {
  userId: string;
  userUuid: string;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
  activeTenantId: string;
  activeTenantSlug: string;
  roles: TenantRole[];
  globalRoles: GlobalRole[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
