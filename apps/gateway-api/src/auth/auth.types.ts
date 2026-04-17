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

export type GatewayAuthContext = {
  userId: string;
  userUuid: string;
  emailHash: string;
  roles: string[];
  defaultProviderId: 'nanogpt' | null;
  defaultModel: string | null;
};
