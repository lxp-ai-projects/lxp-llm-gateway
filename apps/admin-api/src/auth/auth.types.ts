export type TokenType = 'access' | 'refresh';

export type AuthTokenPayload = {
  sub: string;
  emailHash: string;
  type: TokenType;
  roles: string[];
  sessionId: string;
  jti: string;
};

export type AuthenticatedUser = {
  userUuid: string;
  email: string;
  displayName: string;
  status: 'active' | 'disabled';
  roles: string[];
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};
