import type { ProviderId } from '@lxp/domain';

export type GatewayAuthTokenPayload = {
  sub: string;
  emailHash: string;
  type: 'access' | 'refresh';
  roles: string[];
  sessionId: string;
  jti: string;
  iat: number;
  exp: number;
};

export type GatewayAuthIdentitySource =
  | 'access-token'
  | 'openai-compatible-default-user'
  | 'openai-compatible-trusted-header';

export type GatewayAuthContext = {
  userId: string;
  userUuid: string;
  emailHash: string;
  identitySource: GatewayAuthIdentitySource;
  roles: string[];
  defaultProviderId: ProviderId | null;
  defaultModel: string | null;
  defaultImageProviderId: ProviderId | null;
  defaultImageModel: string | null;
};
