import { createHash, createHmac } from 'node:crypto';
import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import type { GlobalRole, TenantRole } from '@lxp/domain';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { ApiKeyEntity } from '../persistence/entities/api-key.entity';
import { IntegrationClientEntity } from '../persistence/entities/integration-client.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import type {
  GatewayAuthContext,
  GatewayAuthIdentitySource,
  GatewayAuthTokenPayload,
} from './auth.types';

@Injectable()
export class GatewayAuthService {
  private readonly logger = new Logger(GatewayAuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(IntegrationClientEntity)
    private readonly integrationClientRepository: Repository<IntegrationClientEntity>,
    @InjectRepository(ApiKeyEntity)
    private readonly apiKeyRepository: Repository<ApiKeyEntity>,
  ) {}

  async authenticateAccessToken(
    authorizationHeader?: string,
    accessTokenCookie?: string,
  ): Promise<GatewayAuthContext> {
    const token =
      accessTokenCookie ?? this.extractBearerToken(authorizationHeader);
    if (!token) {
      throw new UnauthorizedException('Access token is required.');
    }

    const payload = await this.verifyAccessToken(token);
    const user = await this.userRepository.findOne({
      where: {
        emailHash: payload.emailHash,
        status: 'active',
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found for token.');
    }

    const tenantAccess = await this.resolveTenantAccess(
      user.id,
      payload.activeTenantId,
    );

    return {
      ...this.mapUserToAuthContext(
        user,
        'access-token',
        tenantAccess.activeTenantId,
        tenantAccess.activeTenantSlug,
      ),
      roles: tenantAccess.roles,
      globalRoles: tenantAccess.globalRoles,
    };
  }

  async authenticateOpenAiCompatibleRequest(
    authorizationHeader?: string,
    accessTokenCookie?: string,
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): Promise<GatewayAuthContext> {
    const bearerToken = this.tryExtractBearerToken(authorizationHeader);
    const debugEnabled = this.isOpenAiCompatDebugEnabled();

    if (bearerToken) {
      const integrationClientContext =
        await this.tryAuthenticateIntegrationClient(
          bearerToken,
          requestHeaders,
        );
      if (integrationClientContext) {
        this.logCompatibilityRequestAccepted(integrationClientContext);
        if (debugEnabled) {
          this.logger.debug(
            `OpenAI-compatible integration client resolved: client=${integrationClientContext.integrationClientId ?? 'unknown'} userUuid=${integrationClientContext.userUuid} userFingerprint=${this.fingerprintEmailHash(integrationClientContext.emailHash)}`,
          );
        }
        return integrationClientContext;
      }
    }

    const configuredApiKey = process.env.LXP_OPENAI_COMPAT_API_KEY?.trim();
    if (configuredApiKey && bearerToken === configuredApiKey) {
      const authContext = await this.authenticateTrustedOpenAiCompatibleUser(
        requestHeaders,
      );
      this.logCompatibilityRequestAccepted(authContext);
      if (debugEnabled) {
        this.logger.debug(
          `OpenAI-compatible trusted user resolved: userUuid=${authContext.userUuid} userFingerprint=${this.fingerprintEmailHash(authContext.emailHash)}`,
        );
      }
      return authContext;
    }

    const authContext = await this.authenticateAccessToken(
      authorizationHeader,
      accessTokenCookie,
    );
    if (debugEnabled) {
      this.logger.debug(
        `OpenAI-compatible access-token user resolved: userUuid=${authContext.userUuid} userFingerprint=${this.fingerprintEmailHash(authContext.emailHash)}`,
      );
    }
    return authContext;
  }

  private async tryAuthenticateIntegrationClient(
    bearerToken: string,
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): Promise<GatewayAuthContext | null> {
    const keyHash = this.computeApiKeyHash(bearerToken);
    const apiKey =
      (await this.apiKeyRepository.findOne({
        where: {
          keyHash,
          status: 'active',
          expiresAt: MoreThan(new Date()),
        },
        relations: {
          integrationClient: {
            tenant: true,
            defaultUser: true,
          },
        },
      })) ??
      (await this.apiKeyRepository.findOne({
        where: {
          keyHash,
          status: 'active',
          expiresAt: IsNull(),
        },
        relations: {
          integrationClient: {
            tenant: true,
            defaultUser: true,
          },
        },
      }));
    if (!apiKey) {
      return null;
    }

    const integrationClient = apiKey.integrationClient;
    if (
      !integrationClient ||
      integrationClient.status !== 'active' ||
      integrationClient.tenant?.status !== 'active'
    ) {
      throw new UnauthorizedException(
        'Integration client is not active for the supplied API key.',
      );
    }

    const trustedIdentity = this.readTrustedEmailHeader(requestHeaders);
    if (
      trustedIdentity &&
      !integrationClient.trustedForwardedIdentityEnabled
    ) {
      throw new UnauthorizedException(
        'Trusted forwarded identity is not enabled for the supplied integration client.',
      );
    }

    const user = trustedIdentity
      ? await this.resolveTechnicalClientForwardedUser(
          integrationClient.tenantId,
          trustedIdentity.email,
        )
      : await this.resolveTechnicalClientDefaultUser(integrationClient);

    const tenantAccess = await this.resolveTenantAccess(
      user.id,
      integrationClient.tenantId,
    );
    const identitySource: GatewayAuthIdentitySource = trustedIdentity
      ? 'integration-client-trusted-header'
      : 'integration-client-default-user';

    await this.apiKeyRepository.update(
      { id: apiKey.id },
      { lastUsedAt: new Date() },
    );

    this.logCompatibilityIdentityResolved(
      user,
      identitySource,
      trustedIdentity?.headerName,
      integrationClient.clientId,
    );

    return {
      ...this.mapUserToAuthContext(
        user,
        identitySource,
        tenantAccess.activeTenantId,
        tenantAccess.activeTenantSlug,
      ),
      roles: tenantAccess.roles,
      globalRoles: tenantAccess.globalRoles,
      integrationClientId: integrationClient.clientId,
      integrationClientKeyId: apiKey.id,
      integrationClientScopes: this.mergeScopes(
        integrationClient.scopes,
        apiKey.scopes,
      ),
    };
  }

  private async authenticateTrustedOpenAiCompatibleUser(
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): Promise<GatewayAuthContext> {
    const trustedIdentity = this.readTrustedEmailHeader(requestHeaders);
    if (trustedIdentity && !this.isTrustedIdentityCorrelationEnabled()) {
      if (this.isOpenAiCompatDebugEnabled()) {
        this.logger.debug(
          'OpenAI-compatible trusted identity header rejected because trusted identity mode is disabled.',
        );
      }
      throw new UnauthorizedException(
        'Trusted OpenAI-compatible identity headers are not accepted in the current runtime mode.',
      );
    }

    const email =
      trustedIdentity?.email ??
      process.env.LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL?.trim();
    if (!email) {
      throw new UnauthorizedException(
        'OpenAI-compatible access requires a trusted user email header or LXP_OPENAI_COMPAT_DEFAULT_USER_EMAIL.',
      );
    }

    const user = await this.userRepository.findOne({
      where: {
        emailHash: this.computeEmailHash(email),
        status: 'active',
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Trusted OpenAI-compatible user not found for the configured email.',
      );
    }

    const tenantAccess = await this.resolveTrustedTenantAccess(user.id);
    const identitySource: GatewayAuthIdentitySource = trustedIdentity
      ? 'openai-compatible-trusted-header'
      : 'openai-compatible-default-user';
    this.logCompatibilityIdentityResolved(
      user,
      identitySource,
      trustedIdentity?.headerName,
    );

    return {
      ...this.mapUserToAuthContext(
        user,
        identitySource,
        tenantAccess.activeTenantId,
        tenantAccess.activeTenantSlug,
      ),
      roles: tenantAccess.roles,
      globalRoles: tenantAccess.globalRoles,
    };
  }

  private async verifyAccessToken(
    token: string,
  ): Promise<GatewayAuthTokenPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<GatewayAuthTokenPayload>(token);
      if (payload.type !== 'access') {
        throw new UnauthorizedException('Access token is required.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired token.');
    }
  }

  private extractBearerToken(authorizationHeader?: string): string | undefined {
    if (!authorizationHeader) {
      return undefined;
    }

    const [scheme, token] = authorizationHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException(
        'Authorization header must be a Bearer token.',
      );
    }

    return token;
  }

  private tryExtractBearerToken(
    authorizationHeader?: string,
  ): string | undefined {
    try {
      return this.extractBearerToken(authorizationHeader);
    } catch {
      return undefined;
    }
  }

  private readTrustedEmailHeader(
    requestHeaders?: Record<string, string | string[] | undefined>,
  ): { email: string; headerName: string } | undefined {
    const configuredHeaders = this.listTrustedEmailHeaders();
    if (!configuredHeaders.length || !requestHeaders) {
      return undefined;
    }

    const matches = configuredHeaders
      .map((headerName) => {
        const headerValue = requestHeaders[headerName.toLowerCase()];
        const value = Array.isArray(headerValue)
          ? headerValue[0]?.trim() || undefined
          : headerValue?.trim() || undefined;
        if (!value) {
          return undefined;
        }

        return {
          headerName,
          email: value,
        };
      })
      .filter(
        (
          match,
        ): match is {
          email: string;
          headerName: string;
        } => Boolean(match),
      );

    if (!matches.length) {
      return undefined;
    }

    const distinctEmails = new Set(
      matches.map((match) => match.email.trim().toLowerCase()),
    );
    if (distinctEmails.size > 1) {
      throw new UnauthorizedException(
        'Conflicting trusted identity headers were supplied for the OpenAI-compatible request.',
      );
    }

    return matches[0];
  }

  private listTrustedEmailHeaders(): string[] {
    const configuredHeaderList =
      process.env.LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADERS?.trim() ?? '';
    const configuredHeaders = configuredHeaderList
      .split(',')
      .map((header) => header.trim())
      .filter(Boolean);

    if (configuredHeaders.length) {
      return [...new Set(configuredHeaders)];
    }

    const legacyHeader =
      process.env.LXP_OPENAI_COMPAT_TRUSTED_EMAIL_HEADER?.trim();
    return legacyHeader ? [legacyHeader] : [];
  }

  private isTrustedIdentityCorrelationEnabled(): boolean {
    return (
      process.env.LXP_OPENAI_COMPAT_TRUSTED_IDENTITY_ENABLED ?? ''
    ).toLowerCase() === 'true';
  }

  private computeEmailHash(email: string): string {
    const encodedLookupKey = process.env.LXP_EMAIL_LOOKUP_KEY;
    if (!encodedLookupKey) {
      throw new UnauthorizedException(
        'LXP_EMAIL_LOOKUP_KEY is required for trusted OpenAI-compatible user resolution.',
      );
    }

    const lookupKey = Buffer.from(encodedLookupKey, 'base64');
    if (lookupKey.length !== 32) {
      throw new UnauthorizedException(
        'LXP_EMAIL_LOOKUP_KEY must be a base64-encoded 32-byte key.',
      );
    }

    return createHmac('sha256', lookupKey)
      .update(email.trim().toLowerCase())
      .digest('hex');
  }

  private computeApiKeyHash(apiKey: string): string {
    return createHash('sha256').update(apiKey).digest('hex');
  }

  private async resolveTechnicalClientForwardedUser(
    tenantId: string,
    email: string,
  ): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: {
        emailHash: this.computeEmailHash(email),
        status: 'active',
      },
    });
    if (!user) {
      throw new UnauthorizedException(
        'Trusted integration user not found for the forwarded identity.',
      );
    }

    const membership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId,
        userId: user.id,
      },
    });
    if (!membership) {
      throw new UnauthorizedException(
        'Forwarded integration user is not a member of the integration tenant.',
      );
    }

    return user;
  }

  private async resolveTechnicalClientDefaultUser(
    integrationClient: IntegrationClientEntity,
  ): Promise<UserEntity> {
    if (!integrationClient.defaultUserId) {
      throw new UnauthorizedException(
        'Integration client requires a default user or a trusted forwarded identity.',
      );
    }

    const user =
      integrationClient.defaultUser ??
      (await this.userRepository.findOne({
        where: {
          id: integrationClient.defaultUserId,
          status: 'active',
        },
      }));
    if (!user) {
      throw new UnauthorizedException(
        'Integration client default user was not found.',
      );
    }

    const membership = await this.tenantMembershipRepository.findOne({
      where: {
        tenantId: integrationClient.tenantId,
        userId: user.id,
      },
    });
    if (!membership) {
      throw new UnauthorizedException(
        'Integration client default user is not a member of the integration tenant.',
      );
    }

    return user;
  }

  private mapUserToAuthContext(
    user: UserEntity,
    identitySource: GatewayAuthIdentitySource,
    activeTenantId: string,
    activeTenantSlug: string,
  ): Omit<
    GatewayAuthContext,
    'roles' | 'globalRoles' | 'integrationClientScopes'
  > {
    return {
      userId: user.id,
      userUuid: user.userUuid,
      emailHash: user.emailHash,
      activeTenantId,
      activeTenantSlug,
      identitySource,
      defaultProviderId: user.defaultProviderId,
      defaultModel: user.defaultModel,
      defaultImageProviderId: user.defaultImageProviderId,
      defaultImageModel: user.defaultImageModel,
    };
  }

  private async resolveTenantAccess(
    userId: string,
    activeTenantId: string,
  ): Promise<{
    activeTenantId: string;
    activeTenantSlug: string;
    roles: TenantRole[];
    globalRoles: GlobalRole[];
  }> {
    const tenant = await this.tenantRepository.findOne({
      where: {
        id: activeTenantId,
        status: 'active',
      },
    });
    if (!tenant) {
      throw new UnauthorizedException('Active tenant not found for token.');
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: {
        userId,
        tenantId: activeTenantId,
      },
    });
    const roles = memberships.map((membership) => membership.role);
    if (!roles.length) {
      throw new UnauthorizedException(
        'User does not belong to the active tenant.',
      );
    }

    return {
      activeTenantId: tenant.id,
      activeTenantSlug: tenant.slug,
      roles,
      globalRoles: [],
    };
  }

  private async resolveTrustedTenantAccess(userId: string): Promise<{
    activeTenantId: string;
    activeTenantSlug: string;
    roles: TenantRole[];
    globalRoles: GlobalRole[];
  }> {
    const memberships = await this.tenantMembershipRepository.find({
      where: { userId },
      relations: {
        tenant: true,
      },
    });
    const activeMembership = memberships.find(
      (membership) => membership.tenant?.status === 'active',
    );
    if (!activeMembership || !activeMembership.tenant) {
      throw new UnauthorizedException(
        'Trusted OpenAI-compatible user is not attached to an active tenant.',
      );
    }

    return {
      activeTenantId: activeMembership.tenantId,
      activeTenantSlug: activeMembership.tenant.slug,
      roles: memberships
        .filter((membership) => membership.tenantId === activeMembership.tenantId)
        .map((membership) => membership.role),
      globalRoles: [],
    };
  }

  private mergeScopes(
    integrationClientScopes: string[] | null | undefined,
    apiKeyScopes: string[] | null | undefined,
  ): string[] {
    return [...new Set([...(integrationClientScopes ?? []), ...(apiKeyScopes ?? [])])];
  }

  private logCompatibilityRequestAccepted(authContext: GatewayAuthContext): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.compatibility.request.accepted',
        authMode: authContext.integrationClientId
          ? 'integration-client-api-key'
          : 'compatibility-api-key',
        integrationClientId: authContext.integrationClientId ?? null,
        identitySource: authContext.identitySource,
        tenantId: authContext.activeTenantId,
        tenantSlug: authContext.activeTenantSlug,
        resolvedUserUuid: authContext.userUuid,
        userFingerprint: this.fingerprintEmailHash(authContext.emailHash),
      }),
    );
  }

  private logCompatibilityIdentityResolved(
    user: Pick<UserEntity, 'userUuid' | 'emailHash'>,
    identitySource: Extract<
      GatewayAuthIdentitySource,
      | 'openai-compatible-default-user'
      | 'openai-compatible-trusted-header'
      | 'integration-client-default-user'
      | 'integration-client-trusted-header'
    >,
    trustedHeaderName?: string,
    integrationClientId?: string,
  ): void {
    this.logger.log(
      JSON.stringify({
        event: 'gateway.compatibility.identity.resolved',
        identitySource,
        integrationClientId: integrationClientId ?? null,
        trustedHeaderName: trustedHeaderName ?? null,
        resolvedUserUuid: user.userUuid,
        userFingerprint: this.fingerprintEmailHash(user.emailHash),
      }),
    );
  }

  private fingerprintEmailHash(emailHash: string): string {
    return emailHash.slice(0, 16);
  }

  private isOpenAiCompatDebugEnabled(): boolean {
    return (process.env.LXP_OPENAI_COMPAT_DEBUG ?? '').toLowerCase() === 'true';
  }
}
