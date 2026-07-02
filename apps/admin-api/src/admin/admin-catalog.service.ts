import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import type { ProviderId, TenantRole, GlobalRole } from '@lxp/domain';
import type {
  LlmProviderAdapter,
  ProviderAccessConfig,
} from '@lxp/provider-sdk';
import { AnthropicProviderAdapter } from '@lxp/provider-anthropic';
import { DeepSeekProviderAdapter } from '@lxp/provider-deepseek';
import { GoogleProviderAdapter } from '@lxp/provider-google';
import { GroqProviderAdapter } from '@lxp/provider-groq';
import { MistralProviderAdapter } from '@lxp/provider-mistral';
import { MoonshotProviderAdapter } from '@lxp/provider-moonshot';
import { NanoGptProviderAdapter } from '@lxp/provider-nanogpt';
import { OllamaProviderAdapter } from '@lxp/provider-ollama';
import { OpenAiProviderAdapter } from '@lxp/provider-openai';
import { OpenRouterProviderAdapter } from '@lxp/provider-openrouter';
import { XaiProviderAdapter } from '@lxp/provider-xai';
import { ZaiProviderAdapter } from '@lxp/provider-zai';
import { IsNull, Repository } from 'typeorm';

import { TenantMembershipEntity } from '../persistence/entities/tenant-membership.entity';
import {
  TenantProviderConfigurationEntity,
  type TenantProviderCredentialMode,
} from '../persistence/entities/tenant-provider-configuration.entity';
import { TenantEntity } from '../persistence/entities/tenant.entity';
import { ProviderEntity } from '../persistence/entities/provider.entity';
import { UserProviderCredentialEntity } from '../persistence/entities/user-provider-credential.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { TenantRlsService } from '../persistence/tenant-rls.service';
import { EncryptionService } from '../security/encryption.service';
import {
  assertCatalogProviderBaseUrlIsSafe,
  assertProviderAccessIsValid,
  getValidatedPlatformProviderAccess,
} from './admin-provider-access';

type TenantActor = {
  userUuid: string;
  roles: TenantRole[];
  activeTenantId: string;
  activeTenantSlug: string;
  globalRoles?: GlobalRole[];
};

type TenantActorLike = Pick<TenantActor, 'userUuid'> & Partial<TenantActor>;

type TenantProviderConfigurationSummary = {
  id: string | null;
  tenantId: string;
  providerId: ProviderId;
  providerDisplayName: string;
  providerStatus: 'active' | 'disabled';
  enabled: boolean;
  defaultTextModel: string | null;
  defaultImageModel: string | null;
  credentialMode: TenantProviderCredentialMode;
  preferUserCredentials: boolean;
  allowPlatformFallback: boolean;
  allowTenantFallback: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

const ADMIN_LLM_PROVIDERS: LlmProviderAdapter[] = [
  new NanoGptProviderAdapter(),
  new OpenRouterProviderAdapter(),
  new OllamaProviderAdapter(),
  new GroqProviderAdapter(),
  new GoogleProviderAdapter(),
  new OpenAiProviderAdapter(),
  new AnthropicProviderAdapter(),
  new XaiProviderAdapter(),
  new MistralProviderAdapter(),
  new DeepSeekProviderAdapter(),
  new MoonshotProviderAdapter(),
  new ZaiProviderAdapter(),
];

const ADMIN_LLM_PROVIDER_MAP = new Map(
  ADMIN_LLM_PROVIDERS.map((provider) => [provider.providerId, provider]),
);

const PROVIDER_MODEL_LIST_TIMEOUT_MS = 15_000;

@Injectable()
export class AdminCatalogService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantMembershipEntity)
    private readonly tenantMembershipRepository: Repository<TenantMembershipEntity>,
    @InjectRepository(ProviderEntity)
    private readonly providerRepository: Repository<ProviderEntity>,
    @InjectRepository(TenantProviderConfigurationEntity)
    private readonly tenantProviderConfigurationRepository: Repository<TenantProviderConfigurationEntity>,
    private readonly encryptionService: EncryptionService,
    private readonly tenantRlsService: TenantRlsService,
  ) {}

  async listOwnModels(actorLike: TenantActorLike, providerId?: string) {
    const actor = await this.resolveActor(actorLike);
    const user = await this.userRepository.findOne({
      where: {
        userUuid: actor.userUuid,
        status: 'active',
      },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const resolvedProviderId = this.resolveOwnModelsProviderId(user, providerId);
    const providerEntity = await this.assertProviderExists(resolvedProviderId);
    const tenant = await this.assertTenantExists(actor.activeTenantId);
    const configuration = await this.getResolvedTenantProviderConfiguration(
      tenant,
      providerEntity,
    );
    const providerAccess = await this.resolveProviderAccessForConfiguration({
      actor,
      user,
      provider: providerEntity,
      configuration,
    });
    const provider = this.getRegisteredLlmProvider(providerEntity.providerId);

    if (!provider.listModels) {
      throw new NotImplementedException(
        `Provider ${provider.providerId} does not expose a model listing.`,
      );
    }

    try {
      const models = await this.listProviderModelsWithTimeout(
        provider,
        user.id,
        providerAccess,
      );

      return {
        providerId: provider.providerId,
        models,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new BadGatewayException(
        error instanceof Error
          ? error.message
          : 'The provider model listing failed.',
      );
    }
  }

  async getOwnImageCatalog(accessToken: string) {
    return this.fetchGatewayControlPlaneJson(
      accessToken,
      '/api/v1/images/catalog',
    );
  }

  async getOwnVideoCatalog(accessToken: string) {
    return this.fetchGatewayControlPlaneJson(
      accessToken,
      '/api/v1/videos/catalog',
    );
  }

  async proxyGatewayJson<T>(
    accessToken: string,
    path: string,
    options?: {
      method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
      body?: unknown;
      timeoutMs?: number;
    },
  ): Promise<T> {
    const response = await this.fetchGatewayControlPlane(accessToken, path, {
      method: options?.method,
      body: options?.body,
      timeoutMs: options?.timeoutMs,
    });

    return this.parseGatewayJsonResponse(response);
  }

  async proxyGatewayBinary(
    accessToken: string,
    path: string,
    response: ExpressResponse,
  ): Promise<void> {
    const upstreamResponse = await this.fetchGatewayControlPlane(
      accessToken,
      path,
      {
        headers: {
          Accept: '*/*',
        },
      },
    );

    response.status(upstreamResponse.status);
    this.copyGatewayResponseHeader(
      upstreamResponse,
      response,
      'cache-control',
    );
    this.copyGatewayResponseHeader(
      upstreamResponse,
      response,
      'content-disposition',
    );
    this.copyGatewayResponseHeader(upstreamResponse, response, 'content-type');

    response.send(Buffer.from(await upstreamResponse.arrayBuffer()));
  }

  async proxyGatewayChat(
    accessToken: string,
    payload: unknown,
    response: ExpressResponse,
  ): Promise<void> {
    const upstreamResponse = await this.fetchGatewayControlPlane(
      accessToken,
      '/api/v1/chat',
      {
        method: 'POST',
        body: payload,
        headers: {
          Accept: isStreamingChatPayload(payload)
            ? 'text/event-stream'
            : 'application/json',
        },
        timeoutMs: 90_000,
      },
    );

    response.status(upstreamResponse.status);
    this.copyGatewayResponseHeader(upstreamResponse, response, 'content-type');
    this.copyGatewayResponseHeader(upstreamResponse, response, 'cache-control');
    this.copyGatewayResponseHeader(upstreamResponse, response, 'connection');
    this.copyGatewayResponseHeader(upstreamResponse, response, 'x-request-id');

    const contentType = upstreamResponse.headers.get('content-type') ?? '';
    if (
      contentType.includes('text/event-stream') &&
      upstreamResponse.body
    ) {
      response.flushHeaders?.();
      Readable.fromWeb(upstreamResponse.body as never).pipe(response as never);
      return;
    }

    response.send(await upstreamResponse.text());
  }

  private async assertTenantExists(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    return tenant;
  }

  private async assertProviderExists(providerId: string) {
    const provider = await this.providerRepository.findOne({
      where: { providerId: providerId as ProviderId },
    });
    if (!provider) {
      throw new NotFoundException('Provider not found.');
    }

    return provider;
  }

  private async getResolvedTenantProviderConfiguration(
    tenant: TenantEntity,
    provider: ProviderEntity,
  ): Promise<TenantProviderConfigurationSummary> {
    const configuration =
      await this.tenantProviderConfigurationRepository.findOne({
        where: {
          tenantId: tenant.id,
          providerId: provider.id,
        },
      });

    return {
      id: configuration?.id ?? null,
      tenantId: tenant.id,
      providerId: provider.providerId,
      providerDisplayName: provider.displayName,
      providerStatus: provider.status,
      enabled: configuration?.enabled ?? provider.status === 'active',
      defaultTextModel: configuration?.defaultTextModel ?? null,
      defaultImageModel: configuration?.defaultImageModel ?? null,
      credentialMode: configuration?.credentialMode ?? 'hybrid',
      preferUserCredentials: configuration?.preferUserCredentials ?? true,
      allowPlatformFallback: configuration?.allowPlatformFallback ?? false,
      allowTenantFallback: configuration?.allowTenantFallback ?? true,
      createdAt: configuration?.createdAt ?? null,
      updatedAt: configuration?.updatedAt ?? null,
    };
  }

  private async findActiveCredential(
    tenantId: string,
    userId: string | null,
    providerId: string,
    scope: 'tenant' | 'user',
  ): Promise<UserProviderCredentialEntity | null> {
    return this.tenantRlsService.withTenantContext(tenantId, async (manager) =>
      manager.getRepository(UserProviderCredentialEntity).findOne({
        where: {
          tenantId,
          userId: userId ?? IsNull(),
          providerId,
          scope,
          isActive: true,
        },
        order: {
          updatedAt: 'DESC',
          createdAt: 'DESC',
        },
      }),
    );
  }

  private resolveCredentialScopeForConfiguration(
    configuration: TenantProviderConfigurationSummary,
    availability: {
      userCredentialAvailable: boolean;
      tenantCredentialAvailable: boolean;
      platformCredentialAvailable: boolean;
    },
  ): 'user' | 'tenant' | 'platform' | null {
    if (!configuration.enabled || configuration.providerStatus !== 'active') {
      return null;
    }

    if (configuration.credentialMode === 'platform_default') {
      return availability.platformCredentialAvailable ? 'platform' : null;
    }

    const useUserFirst =
      configuration.credentialMode === 'user_byok' ||
      (configuration.credentialMode === 'hybrid' &&
        configuration.preferUserCredentials);

    if (useUserFirst && availability.userCredentialAvailable) {
      return 'user';
    }

    if (
      configuration.allowTenantFallback &&
      availability.tenantCredentialAvailable
    ) {
      return 'tenant';
    }

    if (
      !useUserFirst &&
      configuration.credentialMode === 'hybrid' &&
      availability.userCredentialAvailable
    ) {
      return 'user';
    }

    if (
      configuration.allowPlatformFallback &&
      availability.platformCredentialAvailable
    ) {
      return 'platform';
    }

    return null;
  }

  private buildTenantProviderConfigurationTestMessage(input: {
    configuration: TenantProviderConfigurationSummary;
    canResolve: boolean;
    resolvedCredentialScope: 'user' | 'tenant' | 'platform' | null;
    testedUserUuid: string | null;
    userCredentialAvailable: boolean;
    tenantCredentialAvailable: boolean;
    platformCredentialAvailable: boolean;
  }) {
    if (!input.configuration.enabled) {
      return 'Provider access is disabled for this tenant.';
    }

    if (input.configuration.providerStatus !== 'active') {
      return 'Provider is globally disabled and cannot be used by this tenant.';
    }

    if (input.canResolve && input.resolvedCredentialScope) {
      if (input.resolvedCredentialScope === 'user') {
        return `Resolved user-scoped BYOK credentials for ${input.testedUserUuid}.`;
      }

      if (input.resolvedCredentialScope === 'tenant') {
        return 'Resolved tenant-scoped BYOK credentials for this provider.';
      }

      return 'Resolved platform-level provider credentials for this tenant.';
    }

    if (
      input.configuration.credentialMode === 'user_byok' &&
      !input.userCredentialAvailable
    ) {
      return input.testedUserUuid
        ? `No active user-scoped BYOK credential is configured for ${input.testedUserUuid}.`
        : 'No test user was supplied and no tenant-scoped fallback resolved this provider.';
    }

    if (
      input.configuration.allowTenantFallback &&
      !input.tenantCredentialAvailable
    ) {
      return 'No active tenant-scoped BYOK credential is configured for this provider.';
    }

    if (
      input.configuration.allowPlatformFallback &&
      !input.platformCredentialAvailable
    ) {
      return 'Platform fallback is enabled, but no platform credential is configured in the environment.';
    }

    return 'No credential path could be resolved for this tenant/provider configuration.';
  }

  private getPlatformProviderAccess(
    providerId: ProviderId,
  ): ProviderAccessConfig | null {
    const envByProvider: Record<ProviderId, { apiKey?: string; baseUrl?: string }> = {
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: process.env.ANTHROPIC_BASE_URL,
      },
      google: {
        apiKey: process.env.GOOGLE_API_KEY,
        baseUrl: process.env.GOOGLE_BASE_URL,
      },
      groq: {
        apiKey: process.env.GROQ_API_KEY,
        baseUrl: process.env.GROQ_BASE_URL,
      },
      nanogpt: {
        apiKey: process.env.NANOGPT_API_KEY,
        baseUrl: process.env.NANOGPT_BASE_URL,
      },
      ollama: {
        apiKey: process.env.OLLAMA_API_KEY,
        baseUrl: process.env.OLLAMA_BASE_URL,
      },
      openai: {
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL,
      },
      openrouter: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: process.env.OPENROUTER_BASE_URL,
      },
      mistral: {
        apiKey: process.env.MISTRAL_API_KEY,
        baseUrl: process.env.MISTRAL_BASE_URL,
      },
      deepseek: {
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_BASE_URL,
      },
      moonshot: {
        apiKey: process.env.MOONSHOT_API_KEY,
        baseUrl: process.env.MOONSHOT_BASE_URL,
      },
      xai: {
        apiKey: process.env.XAI_API_KEY,
        baseUrl: process.env.XAI_BASE_URL,
      },
      zai: {
        apiKey: process.env.ZAI_API_KEY,
        baseUrl: process.env.ZAI_BASE_URL,
      },
    };
    const platformAccess = envByProvider[providerId];
    if (!platformAccess) {
      return null;
    }

    const apiKey = platformAccess.apiKey?.trim();
    const baseUrl = platformAccess.baseUrl?.trim();
    if (!apiKey && !baseUrl) {
      return null;
    }

    return {
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
    };
  }

  private getRegisteredLlmProvider(providerId: ProviderId): LlmProviderAdapter {
    const provider = ADMIN_LLM_PROVIDER_MAP.get(providerId);
    if (!provider) {
      throw new NotFoundException(
        `Provider ${providerId} is not registered in admin-api.`,
      );
    }

    return provider;
  }

  private resolveOwnModelsProviderId(
    user: UserEntity,
    providerId?: string,
  ): ProviderId {
    const trimmedProviderId = providerId?.trim();
    if (trimmedProviderId) {
      return trimmedProviderId as ProviderId;
    }

    if (user.defaultProviderId) {
      return user.defaultProviderId;
    }

    throw new BadRequestException(
      'No provider was supplied and no default provider is configured for the authenticated user.',
    );
  }

  private async resolveProviderAccessForConfiguration(input: {
    actor: TenantActor;
    user: UserEntity;
    provider: ProviderEntity;
    configuration: TenantProviderConfigurationSummary;
  }): Promise<ProviderAccessConfig> {
    const [userCredential, tenantCredential] = await Promise.all([
      this.findActiveCredential(
        input.actor.activeTenantId,
        input.user.id,
        input.provider.id,
        'user',
      ),
      this.findActiveCredential(
        input.actor.activeTenantId,
        null,
        input.provider.id,
        'tenant',
      ),
    ]);
    const userProviderAccess = userCredential
      ? this.readProviderAccess(userCredential)
      : null;
    const tenantProviderAccess = tenantCredential
      ? this.readProviderAccess(tenantCredential)
      : null;
    const platformProviderAccess = getValidatedPlatformProviderAccess(
      input.provider.providerId,
      this.getPlatformProviderAccess(input.provider.providerId),
    );
    const resolvedCredentialScope = this.resolveCredentialScopeForConfiguration(
      input.configuration,
      {
        userCredentialAvailable: userProviderAccess !== null,
        tenantCredentialAvailable: tenantProviderAccess !== null,
        platformCredentialAvailable: platformProviderAccess !== null,
      },
    );

    if (resolvedCredentialScope === 'user' && userProviderAccess) {
      return userProviderAccess;
    }

    if (resolvedCredentialScope === 'tenant' && tenantProviderAccess) {
      return tenantProviderAccess;
    }

    if (resolvedCredentialScope === 'platform' && platformProviderAccess) {
      return platformProviderAccess;
    }

    throw new ForbiddenException(
      this.buildTenantProviderConfigurationTestMessage({
        configuration: input.configuration,
        canResolve: false,
        resolvedCredentialScope,
        testedUserUuid: input.user.userUuid,
        userCredentialAvailable: userProviderAccess !== null,
        tenantCredentialAvailable: tenantProviderAccess !== null,
        platformCredentialAvailable: platformProviderAccess !== null,
      }),
    );
  }

  private async listProviderModelsWithTimeout(
    provider: LlmProviderAdapter,
    userId: string,
    providerAccess: ProviderAccessConfig,
  ) {
    assertProviderAccessIsValid(provider.providerId, providerAccess);
    assertCatalogProviderBaseUrlIsSafe(provider.providerId, providerAccess);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        provider.listModels!({
          requestId: randomUUID(),
          userId,
          providerAccess,
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(
              new BadGatewayException(
                'The provider model listing timed out before the server responded.',
              ),
            );
          }, PROVIDER_MODEL_LIST_TIMEOUT_MS);
        }),
      ]);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  private getGatewayControlPlaneBaseUrl(): string {
    const candidates = [
      process.env.GATEWAY_API_URL,
      process.env.LXP_VPS_GATEWAY_API_PUBLIC_URL,
      process.env.VITE_GATEWAY_API_URL,
      'http://127.0.0.1:3001',
    ];
    const resolved = candidates.find(
      (candidate) =>
        typeof candidate === 'string' && candidate.trim().length > 0,
    );

    return (resolved ?? 'http://127.0.0.1:3001').replace(/\/$/, '');
  }

  private async fetchGatewayControlPlaneJson<T>(
    accessToken: string,
    path: string,
  ): Promise<T> {
    const response = await this.fetchGatewayControlPlane(accessToken, path);

    return this.parseGatewayJsonResponse(response);
  }

  private async fetchGatewayControlPlane(
    accessToken: string,
    path: string,
    options?: {
      method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
      body?: unknown;
      headers?: Record<string, string>;
      timeoutMs?: number;
    },
  ): Promise<Response> {
    const gatewayUrl = `${this.getGatewayControlPlaneBaseUrl()}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options?.timeoutMs ?? 15_000,
    );

    let response: Response;
    try {
      response = await fetch(gatewayUrl, {
        method: options?.method ?? 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(options?.body === undefined
            ? {}
            : {
                'Content-Type': 'application/json',
              }),
          ...(options?.headers ?? {}),
        },
        ...(options?.body === undefined
          ? {}
          : {
              body: JSON.stringify(options.body),
            }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new BadGatewayException(
          'The gateway control-plane request timed out before the server responded.',
        );
      }

      throw new BadGatewayException(
        error instanceof Error
          ? error.message
          : 'The gateway control-plane request failed before reaching the server.',
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const body = await response.text();
      throw new HttpException(
        this.formatGatewayProxyErrorMessage(body, response.status),
        response.status,
      );
    }

    return response;
  }

  private async parseGatewayJsonResponse<T>(response: Response): Promise<T> {
    const body = await response.text();
    if (!body.trim()) {
      throw new BadGatewayException(
        'The gateway control-plane response did not contain valid JSON.',
      );
    }

    try {
      return JSON.parse(body) as T;
    } catch {
      throw new BadGatewayException(
        'The gateway control-plane response did not contain valid JSON.',
      );
    }
  }

  private copyGatewayResponseHeader(
    upstreamResponse: Response,
    response: ExpressResponse,
    headerName: string,
  ) {
    const headerValue = upstreamResponse.headers.get(headerName);
    if (!headerValue) {
      return;
    }

    response.setHeader(headerName, headerValue);
  }

  private formatGatewayProxyErrorMessage(body: string, status: number): string {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      return `Gateway control-plane request failed with ${status}.`;
    }

    try {
      const parsed = JSON.parse(trimmedBody) as {
        message?: string | string[];
      };
      if (typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim();
      }
      if (
        Array.isArray(parsed.message) &&
        parsed.message.every((entry) => typeof entry === 'string')
      ) {
        return parsed.message.join(', ').trim();
      }
    } catch {
      // Fall through to raw text below.
    }

    return trimmedBody;
  }

  private async resolveActor(actor: TenantActorLike): Promise<TenantActor> {
    if (actor.activeTenantId && actor.activeTenantSlug && actor.roles) {
      return {
        userUuid: actor.userUuid,
        activeTenantId: actor.activeTenantId,
        activeTenantSlug: actor.activeTenantSlug,
        roles: actor.roles,
        globalRoles: actor.globalRoles ?? [],
      };
    }

    const user = await this.userRepository.findOne({
      where: { userUuid: actor.userUuid },
    });
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (!actor.activeTenantId) {
      throw new NotFoundException('User not found.');
    }

    const memberships = await this.tenantMembershipRepository.find({
      where: { userId: user.id, tenantId: actor.activeTenantId },
      relations: {
        tenant: true,
      },
    });
    const membership = memberships.find(
      (entry) =>
        entry.tenant?.status === 'active' &&
        entry.tenantId === actor.activeTenantId,
    );
    if (!membership || !membership.tenant) {
      throw new NotFoundException('User not found.');
    }

    return {
      userUuid: user.userUuid,
      activeTenantId: membership.tenantId,
      activeTenantSlug: actor.activeTenantSlug ?? membership.tenant.slug,
      roles: memberships
        .filter((entry) => entry.tenantId === membership.tenantId)
        .map((entry) => entry.role),
      globalRoles: actor.globalRoles ?? [],
    };
  }

  private readProviderAccess(
    credential: UserProviderCredentialEntity,
  ): ProviderAccessConfig {
    const decryptedPayload = this.encryptionService.decrypt({
      ciphertext: credential.encryptedSecret,
      iv: credential.iv,
      authTag: credential.authTag,
      keyVersion: credential.keyVersion,
    });

    try {
      return JSON.parse(decryptedPayload) as ProviderAccessConfig;
    } catch {
      return {
        apiKey: decryptedPayload,
      };
    }
  }
}

function isStreamingChatPayload(
  payload: unknown,
): payload is { stream: true } {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'stream' in payload &&
    (payload as { stream?: unknown }).stream === true
  );
}
