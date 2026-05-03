import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { GatewayImageCatalogProvider } from '@lxp/contracts';
import type { ProviderId } from '@lxp/domain';
import type { ProviderModel } from '@lxp/provider-sdk';
import { Repository } from 'typeorm';

import { TenantModelAccessRuleEntity } from '../persistence/entities/tenant-model-access-rule.entity';

type TenantModelAccessCapability = 'text' | 'image';

type EffectiveRule = {
  effect: 'allow' | 'deny';
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  maxImagesPerRequest: number | null;
  maxResolution: string | null;
};

export class ModelAccessPolicyException extends ForbiddenException {}

export class ModelAccessLimitException extends BadRequestException {}

@Injectable()
export class TenantModelAccessRuleService {
  constructor(
    @InjectRepository(TenantModelAccessRuleEntity)
    private readonly tenantModelAccessRuleRepository: Repository<TenantModelAccessRuleEntity>,
  ) {}

  async assertTextModelAllowed(
    tenantId: string,
    providerId: ProviderId,
    model: string,
  ): Promise<void> {
    const rule = await this.resolveEffectiveRule(
      tenantId,
      providerId,
      model,
      'text',
    );
    if (rule?.effect === 'deny') {
      throw new ModelAccessPolicyException(
        `Model ${providerId}/${model} is denied for tenant ${tenantId}.`,
      );
    }
  }

  async assertImageModelAllowed(params: {
    tenantId: string;
    providerId: ProviderId;
    model: string;
    imageCount?: number;
    resolution?: string;
  }): Promise<void> {
    const rule = await this.resolveEffectiveRule(
      params.tenantId,
      params.providerId,
      params.model,
      'image',
    );
    if (rule?.effect === 'deny') {
      throw new ModelAccessPolicyException(
        `Model ${params.providerId}/${params.model} is denied for tenant ${params.tenantId}.`,
      );
    }

    if (
      rule?.maxImagesPerRequest !== null &&
      rule?.maxImagesPerRequest !== undefined &&
      (params.imageCount ?? 1) > rule.maxImagesPerRequest
    ) {
      throw new ModelAccessLimitException(
        `Image requests for ${params.providerId}/${params.model} are limited to ${rule.maxImagesPerRequest} image(s) per request for this tenant.`,
      );
    }

    if (
      rule?.maxResolution &&
      params.resolution &&
      this.isResolutionAboveLimit(params.resolution, rule.maxResolution)
    ) {
      throw new ModelAccessLimitException(
        `Image requests for ${params.providerId}/${params.model} cannot exceed resolution ${rule.maxResolution} for this tenant.`,
      );
    }
  }

  async filterTextModels(
    tenantId: string,
    providerId: ProviderId,
    models: ProviderModel[],
  ): Promise<ProviderModel[]> {
    const rules = await this.listMatchingRules(tenantId, providerId, 'text');
    if (!rules.length) {
      return models;
    }

    return models.filter((model) => {
      const rule = this.pickEffectiveRule(rules, model.id);
      return rule?.effect !== 'deny';
    });
  }

  async filterImageCatalogProvider(
    tenantId: string,
    provider: GatewayImageCatalogProvider,
  ): Promise<GatewayImageCatalogProvider | null> {
    const rules = await this.listMatchingRules(
      tenantId,
      provider.providerId as ProviderId,
      'image',
    );
    if (!rules.length) {
      return provider;
    }

    const models = provider.models.filter((model) => {
      const rule = this.pickEffectiveRule(rules, model.id);
      return rule?.effect !== 'deny';
    });
    if (!models.length) {
      return null;
    }

    const defaultModelStillAllowed = provider.defaultModelId
      ? models.some((model) => model.id === provider.defaultModelId)
      : false;

    return {
      ...provider,
      defaultModelId: defaultModelStillAllowed
        ? provider.defaultModelId
        : models[0]?.id ?? null,
      models,
    };
  }

  private async resolveEffectiveRule(
    tenantId: string,
    providerId: ProviderId,
    model: string,
    capability: TenantModelAccessCapability,
  ): Promise<EffectiveRule | null> {
    const rules = await this.listMatchingRules(tenantId, providerId, capability);
    return this.pickEffectiveRule(rules, model);
  }

  private async listMatchingRules(
    tenantId: string,
    providerId: ProviderId,
    capability: TenantModelAccessCapability,
  ): Promise<TenantModelAccessRuleEntity[]> {
    return this.tenantModelAccessRuleRepository.find({
      where: {
        tenantId,
        providerId,
        capability,
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  private pickEffectiveRule(
    rules: TenantModelAccessRuleEntity[],
    model: string,
  ): EffectiveRule | null {
    const matchingRules = rules
      .filter((rule) => this.matchesPattern(model, rule.modelPattern))
      .sort((left, right) => {
        if (left.priority !== right.priority) {
          return right.priority - left.priority;
        }

        if (left.effect !== right.effect) {
          return left.effect === 'deny' ? -1 : 1;
        }

        return right.createdAt.getTime() - left.createdAt.getTime();
      });

    const winningRule = matchingRules[0];
    if (!winningRule) {
      return null;
    }

    return {
      effect: winningRule.effect,
      maxInputTokens: winningRule.maxInputTokens,
      maxOutputTokens: winningRule.maxOutputTokens,
      maxImagesPerRequest: winningRule.maxImagesPerRequest,
      maxResolution: winningRule.maxResolution,
    };
  }

  private matchesPattern(model: string, pattern: string): boolean {
    const escapedPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*');
    return new RegExp(`^${escapedPattern}$`, 'i').test(model);
  }

  private isResolutionAboveLimit(
    requestedResolution: string,
    maxResolution: string,
  ): boolean {
    const requested = this.parseResolution(requestedResolution);
    const max = this.parseResolution(maxResolution);
    if (!requested || !max) {
      return false;
    }

    return requested.width > max.width || requested.height > max.height;
  }

  private parseResolution(
    resolution: string,
  ): { width: number; height: number } | null {
    const match = /^(\d{2,5})x(\d{2,5})$/i.exec(resolution.trim());
    if (!match) {
      return null;
    }

    return {
      width: Number(match[1]),
      height: Number(match[2]),
    };
  }
}
