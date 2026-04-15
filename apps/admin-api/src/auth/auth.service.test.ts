import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { JwtService } from '@nestjs/jwt';

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

  async setRefreshSession(sessionId: string, refreshJti: string): Promise<void> {
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
  process.env.LXP_EMAIL_LOOKUP_KEY = 'tPWBQyo3zw8z8HgCPWVb7968QdQ6jGHQ9Nh2gWmC8qY=';

  const encryptionService = new EncryptionService();
  const emailProtectionService = new EmailProtectionService(encryptionService);
  const passwordService = new PasswordService();
  const tokenStore = new InMemoryAuthTokenStore();
  const protectedEmail = emailProtectionService.protect('laurie@example.com');
  const passwordHash = await passwordService.hashPassword('Sup3rS3cret!');
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
  };
  const userRoleRepository = {
    find: async () => [{ role: { name: 'admin' } }, { role: { name: 'user' } }],
  };
  const jwtService = new JwtService({
    secret: 'test-secret',
  });
  const authService = new AuthService(
    userRepository as never,
    userRoleRepository as never,
    emailProtectionService,
    passwordService,
    jwtService,
    tokenStore as never,
  );

  return { authService, jwtService, tokenStore, user };
}

test('AuthService login issues access and refresh tokens with user payload', async () => {
  const { authService, jwtService, tokenStore, user } = await buildAuthService();

  const result = await authService.login('laurie@example.com', 'Sup3rS3cret!');
  const accessPayload = await jwtService.verifyAsync<AuthTokenPayload>(result.accessToken);
  const refreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(result.refreshToken);

  assert.equal(accessPayload.type, 'access');
  assert.equal(refreshPayload.type, 'refresh');
  assert.equal(accessPayload.sub, user.emailHash);
  assert.equal(accessPayload.emailHash, user.emailHash);
  assert.deepEqual(accessPayload.roles, ['admin', 'user']);
  assert.equal(refreshPayload.sessionId, accessPayload.sessionId);
  assert.equal(await tokenStore.getRefreshSession(refreshPayload.sessionId), refreshPayload.jti);
});

test('AuthService refresh rotates the refresh token and blacklists the prior token', async () => {
  const { authService, jwtService, tokenStore } = await buildAuthService();

  const loginResult = await authService.login('laurie@example.com', 'Sup3rS3cret!');
  const previousRefreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    loginResult.refreshToken,
  );
  const refreshResult = await authService.refresh(loginResult.refreshToken);
  const nextRefreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(
    refreshResult.refreshToken,
  );

  assert.equal(await tokenStore.isTokenBlacklisted(previousRefreshPayload.jti), true);
  assert.equal(previousRefreshPayload.sessionId, nextRefreshPayload.sessionId);
  assert.notEqual(previousRefreshPayload.jti, nextRefreshPayload.jti);
  assert.equal(
    await tokenStore.getRefreshSession(previousRefreshPayload.sessionId),
    nextRefreshPayload.jti,
  );
});

test('AuthService logout revokes current tokens', async () => {
  const { authService, jwtService, tokenStore } = await buildAuthService();

  const loginResult = await authService.login('laurie@example.com', 'Sup3rS3cret!');
  const accessPayload = await jwtService.verifyAsync<AuthTokenPayload>(loginResult.accessToken);
  const refreshPayload = await jwtService.verifyAsync<AuthTokenPayload>(loginResult.refreshToken);

  await authService.logout(loginResult.accessToken, loginResult.refreshToken);

  assert.equal(await tokenStore.isTokenBlacklisted(accessPayload.jti), true);
  assert.equal(await tokenStore.isTokenBlacklisted(refreshPayload.jti), true);
  assert.equal(await tokenStore.getRefreshSession(refreshPayload.sessionId), null);
});

test('AuthService rejects a blacklisted access token for authenticated user lookup', async () => {
  const { authService } = await buildAuthService();

  const loginResult = await authService.login('laurie@example.com', 'Sup3rS3cret!');
  await authService.logout(loginResult.accessToken, undefined);

  await assert.rejects(
    () => authService.getAuthenticatedUser(loginResult.accessToken),
    /Invalid or expired token/,
  );
});
