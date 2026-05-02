import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { JwtService } from '@nestjs/jwt';

import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { EmailProtectionService } from '../security/email-protection.service';
import { EncryptionService } from '../security/encryption.service';
import { PasswordService } from '../security/password.service';
import { AuthService } from './auth.service';
import type { AuthTokenPayload } from './auth.types';

class InMemoryAuthTokenStore {
  readonly blacklistedTokens = new Map<string, string>();
  readonly refreshSessions = new Map<string, string>();

  async blacklistToken(jti: string): Promise<void> {
    this.blacklistedTokens.set(jti, 'revoked');
  }

  async isTokenBlacklisted(jti: string): Promise<boolean> {
    return this.blacklistedTokens.has(jti);
  }

  async setRefreshSession(
    sessionId: string,
    refreshJti: string,
  ): Promise<void> {
    this.refreshSessions.set(sessionId, refreshJti);
  }

  async getRefreshSession(sessionId: string): Promise<string | null> {
    return this.refreshSessions.get(sessionId) ?? null;
  }

  async deleteRefreshSession(sessionId: string): Promise<void> {
    this.refreshSessions.delete(sessionId);
  }
}

async function buildAuthService() {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'AEkZcducf2qDu4KA7t9i5PnWekbV/CGYBlBwJ9qCmjQ=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY =
    'tPWBQyo3zw8z8HgCPWVb7968QdQ6jGHQ9Nh2gWmC8qY=';

  const encryptionService = new EncryptionService();
  const emailProtectionService = new EmailProtectionService(encryptionService);
  const passwordService = new PasswordService();
  const tokenStore = new InMemoryAuthTokenStore();
  const protectedEmail = emailProtectionService.protect('laurie@example.com');
  const passwordHash = await passwordService.hashPassword('Sup3rS3cret!');
  const tenant: TenantEntity = {
    id: randomUUID(),
    slug: 'lxp-internal',
    displayName: 'LXP Internal',
    allowUserCredentialOverride: true,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [],
    providerCredentials: [],
  };
  const user: UserEntity = {
    id: randomUUID(),
    userUuid: randomUUID(),
    emailHash: protectedEmail.emailHash,
    encryptedEmail: protectedEmail.encryptedEmail,
    emailIv: protectedEmail.emailIv,
    emailAuthTag: protectedEmail.emailAuthTag,
    emailKeyVersion: protectedEmail.emailKeyVersion,
    passwordHash,
    displayName: 'Laurie',
    status: 'active',
    lastActiveTenantId: tenant.id,
    defaultProviderId: null,
    defaultModel: null,
    defaultImageProviderId: null,
    defaultImageModel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
    providerCredentials: [],
  };
  const userRepository = {
    findOne: async ({ where }: { where: Partial<UserEntity> }) =>
      where.emailHash === user.emailHash ||
      where.id === user.id ||
      where.userUuid === user.userUuid
        ? user
        : null,
    save: async (value: UserEntity) => value,
  };
  const tenantMembership: TenantMembershipEntity = {
    id: randomUUID(),
    tenantId: tenant.id,
    userId: user.id,
    role: 'tenant_admin',
    createdAt: new Date(),
    tenant,
    user,
  };
  const tenantRepository = {
    findOne: async ({ where }: { where: Partial<TenantEntity> }) =>
      (where.id === tenant.id || where.slug === tenant.slug) &&
      (where.status === undefined || where.status === tenant.status)
        ? tenant
        : null,
    find: async () => [tenant],
  };
  const tenantMembershipRepository = {
    find: async ({ where }: { where: Partial<TenantMembershipEntity> }) =>
      where.userId === user.id ? [tenantMembership] : [],
  };
  const roleRepository = {
    find: async () => [],
  };
  const userRoleRepository = {
    find: async () => [],
  };
  const jwtService = new JwtService({
    secret: 'test-secret',
  });
  const authService = new AuthService(
    userRepository as never,
    tenantRepository as never,
    tenantMembershipRepository as never,
    roleRepository as never,
    userRoleRepository as never,
    emailProtectionService,
    passwordService,
    jwtService,
    tokenStore as never,
  );

  return { authService, jwtService, tokenStore, user };
}

async function buildAuthServiceWithUser(
  overrides: Partial<UserEntity>,
  roles = ['admin', 'user'],
) {
  process.env.LXP_ENCRYPTION_MASTER_KEY =
    'AEkZcducf2qDu4KA7t9i5PnWekbV/CGYBlBwJ9qCmjQ=';
  process.env.LXP_ENCRYPTION_KEY_VERSION = '1';
  process.env.LXP_EMAIL_LOOKUP_KEY =
    'tPWBQyo3zw8z8HgCPWVb7968QdQ6jGHQ9Nh2gWmC8qY=';

  const encryptionService = new EncryptionService();
  const emailProtectionService = new EmailProtectionService(encryptionService);
  const passwordService = new PasswordService();
  const tokenStore = new InMemoryAuthTokenStore();
  const protectedEmail = emailProtectionService.protect('laurie@example.com');
  const passwordHash = await passwordService.hashPassword('Sup3rS3cret!');
  const tenant: TenantEntity = {
    id: randomUUID(),
    slug: 'lxp-internal',
    displayName: 'LXP Internal',
    allowUserCredentialOverride: true,
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    memberships: [],
    providerCredentials: [],
  };
  const user: UserEntity = {
    id: randomUUID(),
    userUuid: randomUUID(),
    emailHash: protectedEmail.emailHash,
    encryptedEmail: protectedEmail.encryptedEmail,
    emailIv: protectedEmail.emailIv,
    emailAuthTag: protectedEmail.emailAuthTag,
    emailKeyVersion: protectedEmail.emailKeyVersion,
    passwordHash,
    displayName: 'Laurie',
    status: 'active',
    lastActiveTenantId: tenant.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [],
    providerCredentials: [],
    ...overrides,
    defaultProviderId: overrides.defaultProviderId ?? null,
    defaultModel: overrides.defaultModel ?? null,
    defaultImageProviderId: overrides.defaultImageProviderId ?? null,
    defaultImageModel: overrides.defaultImageModel ?? null,
  };
  const userRepository = {
    findOne: async ({ where }: { where: Partial<UserEntity> }) =>
      where.emailHash === user.emailHash ||
      where.id === user.id ||
      where.userUuid === user.userUuid
        ? user
        : null,
    save: async (value: UserEntity) => value,
  };
  const tenantMembership: TenantMembershipEntity = {
    id: randomUUID(),
    tenantId: tenant.id,
    userId: user.id,
    role: 'tenant_admin',
    createdAt: new Date(),
    tenant,
    user,
  };
  const tenantRepository = {
    findOne: async ({ where }: { where: Partial<TenantEntity> }) =>
      (where.id === tenant.id || where.slug === tenant.slug) &&
      (where.status === undefined || where.status === tenant.status)
        ? tenant
        : null,
    find: async () => [tenant],
  };
  const tenantMembershipRepository = {
    find: async ({ where }: { where: Partial<TenantMembershipEntity> }) =>
      where.userId === user.id ? [tenantMembership] : [],
  };
  const roleRepository = {
    find: async () => [],
  };
  const userRoleRepository = {
    find: async () => roles.map((role) => ({ role: { name: role } })),
  };
  const jwtService = new JwtService({
    secret: 'test-secret',
  });
  const authService = new AuthService(
    userRepository as never,
    tenantRepository as never,
    tenantMembershipRepository as never,
    roleRepository as never,
    userRoleRepository as never,
    emailProtectionService,
    passwordService,
    jwtService,
    tokenStore as never,
  );

  return { authService, jwtService, tokenStore, user };
}

test('AuthService login issues access and refresh tokens with user payload', async () => {
  const { authService, jwtService, tokenStore, user } =
    await buildAuthService();

  const result = await authService.login('laurie@example.com', 'Sup3rS3cret!');
  const accessPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    result.accessToken,
  );
  const refreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    result.refreshToken,
  );

  assert.equal(accessPayload.type, 'access');
  assert.equal(refreshPayload.type, 'refresh');
  assert.equal(accessPayload.sub, user.emailHash);
  assert.equal(accessPayload.emailHash, user.emailHash);
  assert.equal(accessPayload.activeTenantSlug, 'lxp-internal');
  assert.deepEqual(accessPayload.roles, ['tenant_admin']);
  assert.deepEqual(accessPayload.globalRoles, []);
  assert.equal(refreshPayload.sessionId, accessPayload.sessionId);
  assert.equal(
    await tokenStore.getRefreshSession(refreshPayload.sessionId),
    refreshPayload.jti,
  );
});

test('AuthService refresh rotates the refresh token and blacklists the prior token', async () => {
  const { authService, jwtService, tokenStore } = await buildAuthService();

  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );
  const previousRefreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    loginResult.refreshToken,
  );
  const refreshResult = await authService.refresh(loginResult.refreshToken);
  const nextRefreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    refreshResult.refreshToken,
  );

  assert.equal(
    await tokenStore.isTokenBlacklisted(previousRefreshPayload.jti),
    true,
  );
  assert.equal(previousRefreshPayload.sessionId, nextRefreshPayload.sessionId);
  assert.notEqual(previousRefreshPayload.jti, nextRefreshPayload.jti);
  assert.equal(
    await tokenStore.getRefreshSession(previousRefreshPayload.sessionId),
    nextRefreshPayload.jti,
  );
});

test('AuthService logout revokes current tokens', async () => {
  const { authService, jwtService, tokenStore } = await buildAuthService();

  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );
  const accessPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    loginResult.accessToken,
  );
  const refreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    loginResult.refreshToken,
  );

  await authService.logout(loginResult.accessToken, loginResult.refreshToken);

  assert.equal(await tokenStore.isTokenBlacklisted(accessPayload.jti), true);
  assert.equal(await tokenStore.isTokenBlacklisted(refreshPayload.jti), true);
  assert.equal(
    await tokenStore.getRefreshSession(refreshPayload.sessionId),
    null,
  );
});

test('AuthService rejects a blacklisted access token for authenticated user lookup', async () => {
  const { authService } = await buildAuthService();

  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );
  await authService.logout(loginResult.accessToken, undefined);

  await assert.rejects(
    () => authService.getAuthenticatedUser(loginResult.accessToken),
    /Invalid or expired token/,
  );
});

test('AuthService returns the authenticated user profile for a valid access token', async () => {
  const { authService, user } = await buildAuthService();

  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );
  const authenticatedUser = await authService.getAuthenticatedUser(
    loginResult.accessToken,
  );

  assert.equal(authenticatedUser.userUuid, user.userUuid);
  assert.equal(authenticatedUser.email, 'laurie@example.com');
  assert.equal(authenticatedUser.displayName, user.displayName);
  assert.equal(authenticatedUser.status, user.status);
  assert.deepEqual(authenticatedUser.roles, ['tenant_admin']);
  assert.equal(authenticatedUser.activeTenantSlug, 'lxp-internal');
  assert.equal(authenticatedUser.availableTenants.length, 1);
});

test('AuthService rejects login when the password is wrong', async () => {
  const { authService } = await buildAuthService();

  await assert.rejects(
    () => authService.login('laurie@example.com', 'wrong-password'),
    /Invalid email or password/,
  );
});

test('AuthService rejects login when the user is inactive', async () => {
  const { authService } = await buildAuthServiceWithUser({
    status: 'disabled',
  });

  await assert.rejects(
    () => authService.login('laurie@example.com', 'Sup3rS3cret!'),
    /Invalid email or password/,
  );
});

test('AuthService rejects refresh when the refreshed user is inactive', async () => {
  const { authService } = await buildAuthServiceWithUser({
    status: 'disabled',
  });

  const activeService = await buildAuthService();
  const loginResult = await activeService.authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );

  await assert.rejects(
    () => authService.refresh(loginResult.refreshToken),
    /Invalid or expired token/,
  );
});

test('AuthService rejects access token lookup when token type is refresh', async () => {
  const { authService, jwtService, user } = await buildAuthService();
  const refreshAsAccess = await jwtService.signAsync({
    sub: user.emailHash,
    userId: user.id,
    emailHash: user.emailHash,
    activeTenantId: user.lastActiveTenantId!,
    activeTenantSlug: 'lxp-internal',
    type: 'refresh',
    roles: ['tenant_admin'],
    globalRoles: [],
    sessionId: randomUUID(),
    jti: randomUUID(),
  } satisfies AuthTokenPayload);

  await assert.rejects(
    () => authService.getAuthenticatedUser(refreshAsAccess),
    /Unexpected token type/,
  );
});

test('AuthService rejects invalid access tokens', async () => {
  const { authService } = await buildAuthService();

  await assert.rejects(
    () => authService.getAuthenticatedUser('not-a-token'),
    /Invalid or expired token/,
  );
});

test('AuthService rejects login when no user matches the email', async () => {
  const { authService } = await buildAuthService();

  await assert.rejects(
    () => authService.login('unknown@example.com', 'Sup3rS3cret!'),
    /Invalid email or password/,
  );
});

test('AuthService rejects refresh when the token was blacklisted', async () => {
  const { authService } = await buildAuthService();
  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );

  await authService.logout(undefined, loginResult.refreshToken);

  await assert.rejects(
    () => authService.refresh(loginResult.refreshToken),
    /Invalid or expired token/,
  );
});

test('AuthService rejects refresh when the stored session token does not match', async () => {
  const { authService, tokenStore } = await buildAuthService();
  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );
  tokenStore.refreshSessions.clear();

  await assert.rejects(
    () => authService.refresh(loginResult.refreshToken),
    /Invalid or expired token/,
  );
});

test('AuthService rejects refresh when token type is access', async () => {
  const { authService } = await buildAuthService();
  const loginResult = await authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );

  await assert.rejects(
    () => authService.refresh(loginResult.accessToken),
    /Unexpected token type/,
  );
});

test('AuthService logout ignores missing or invalid tokens', async () => {
  const { authService, tokenStore } = await buildAuthService();

  await authService.logout(undefined, 'not-a-token');

  assert.equal(tokenStore.blacklistedTokens.size, 0);
  assert.equal(tokenStore.refreshSessions.size, 0);
});

test('AuthService rejects authenticated user lookup when the resolved user is inactive', async () => {
  const { authService } = await buildAuthServiceWithUser({
    status: 'disabled',
  });
  const activeService = await buildAuthService();
  const loginResult = await activeService.authService.login(
    'laurie@example.com',
    'Sup3rS3cret!',
  );

  await assert.rejects(
    () => authService.getAuthenticatedUser(loginResult.accessToken),
    /Invalid or expired token/,
  );
});
