import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import { TenantPolicyEntity } from '../persistence/entities/tenant-policy.entity';
import { UsageEventEntity } from '../persistence/entities/usage-event.entity';

export class TenantPolicyLimitException extends ForbiddenException {
  constructor(
    readonly errorCode: string,
    message: string,
    readonly metadata: Record<string, unknown> | null = null,
  ) {
    super(message);
  }
}

type ResolvedTenantPolicy = {
  tenantId: string;
  monthlyBudgetUsd: string | null;
  dailyRequestLimit: number | null;
  monthlyRequestLimit: number | null;
  requestsPerMinute: number;
  tokensPerMinute: number;
  monthlyTokenLimit: number | null;
  imageRequestsPerMonth: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  allowPromptLogging: boolean;
  allowResponseLogging: boolean;
  retentionDays: number;
};

@Injectable()
export class TenantPolicyService {
  constructor(
    @InjectRepository(TenantPolicyEntity)
    private readonly tenantPolicyRepository: Repository<TenantPolicyEntity>,
    @InjectRepository(UsageEventEntity)
    private readonly usageEventRepository: Repository<UsageEventEntity>,
  ) {}

  async resolvePolicy(tenantId: string): Promise<ResolvedTenantPolicy> {
    const policy = await this.tenantPolicyRepository.findOne({
      where: { tenantId },
    });

    return {
      tenantId,
      monthlyBudgetUsd: policy?.monthlyBudgetUsd ?? null,
      dailyRequestLimit: policy?.dailyRequestLimit ?? null,
      monthlyRequestLimit: policy?.monthlyRequestLimit ?? null,
      requestsPerMinute: policy?.requestsPerMinute ?? 60,
      tokensPerMinute: policy?.tokensPerMinute ?? 100000,
      monthlyTokenLimit: policy?.monthlyTokenLimit ?? null,
      imageRequestsPerMonth: policy?.imageRequestsPerMonth ?? null,
      maxInputTokens: policy?.maxInputTokens ?? null,
      maxOutputTokens: policy?.maxOutputTokens ?? null,
      allowPromptLogging: policy?.allowPromptLogging ?? false,
      allowResponseLogging: policy?.allowResponseLogging ?? false,
      retentionDays: policy?.retentionDays ?? 30,
    };
  }

  async assertTextRequestAllowed(input: {
    tenantId: string;
    providerId: string;
    model: string;
  }): Promise<ResolvedTenantPolicy> {
    const policy = await this.resolvePolicy(input.tenantId);
    await this.assertRequestWindows(policy, input);
    await this.assertMonthlyBudget(policy, input);
    await this.assertMonthlyTokenLimit(policy, input);
    return policy;
  }

  async assertImageRequestAllowed(input: {
    tenantId: string;
    providerId: string;
    model: string;
  }): Promise<ResolvedTenantPolicy> {
    const policy = await this.resolvePolicy(input.tenantId);
    await this.assertRequestWindows(policy, input);
    await this.assertMonthlyBudget(policy, input);
    await this.assertImageRequestLimit(policy, input);
    return policy;
  }

  private async assertRequestWindows(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string; providerId: string; model: string },
  ): Promise<void> {
    const lastMinuteCount = await this.usageEventRepository.count({
      where: {
        tenantId: input.tenantId,
        createdAt: MoreThanOrEqual(this.buildLowerBoundDate(60 * 1000)),
      },
    });
    if (lastMinuteCount >= policy.requestsPerMinute) {
      throw new TenantPolicyLimitException(
        'tenant_requests_per_minute_exceeded',
        `Tenant ${input.tenantId} exceeded the requests-per-minute limit.`,
        {
          limit: policy.requestsPerMinute,
          window: 'minute',
          current: lastMinuteCount,
        },
      );
    }

    const lastMinuteTokens = await this.sumNumericColumn(
      input.tenantId,
      'totalTokens',
      60 * 1000,
    );
    if (lastMinuteTokens >= policy.tokensPerMinute) {
      throw new TenantPolicyLimitException(
        'tenant_tokens_per_minute_exceeded',
        `Tenant ${input.tenantId} exceeded the tokens-per-minute limit.`,
        {
          limit: policy.tokensPerMinute,
          window: 'minute',
          current: lastMinuteTokens,
        },
      );
    }

    if (policy.dailyRequestLimit !== null) {
      const lastDayCount = await this.usageEventRepository.count({
        where: {
          tenantId: input.tenantId,
          createdAt: MoreThanOrEqual(
            this.buildLowerBoundDate(24 * 60 * 60 * 1000),
          ),
        },
      });
      if (lastDayCount >= policy.dailyRequestLimit) {
        throw new TenantPolicyLimitException(
          'tenant_daily_request_limit_exceeded',
          `Tenant ${input.tenantId} exceeded the daily request limit.`,
          {
            limit: policy.dailyRequestLimit,
            window: 'day',
            current: lastDayCount,
          },
        );
      }
    }

    if (policy.monthlyRequestLimit !== null) {
      const lastMonthCount = await this.usageEventRepository.count({
        where: {
          tenantId: input.tenantId,
          createdAt: MoreThanOrEqual(
            this.buildLowerBoundDate(30 * 24 * 60 * 60 * 1000),
          ),
        },
      });
      if (lastMonthCount >= policy.monthlyRequestLimit) {
        throw new TenantPolicyLimitException(
          'tenant_monthly_request_limit_exceeded',
          `Tenant ${input.tenantId} exceeded the monthly request limit.`,
          {
            limit: policy.monthlyRequestLimit,
            window: 'month',
            current: lastMonthCount,
          },
        );
      }
    }
  }

  private async assertMonthlyBudget(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string },
  ): Promise<void> {
    if (policy.monthlyBudgetUsd === null) {
      return;
    }

    const current = await this.sumNumericColumn(
      input.tenantId,
      'costEstimateUsd',
      30 * 24 * 60 * 60 * 1000,
    );
    if (current >= Number(policy.monthlyBudgetUsd)) {
      throw new TenantPolicyLimitException(
        'tenant_monthly_budget_exceeded',
        `Tenant ${input.tenantId} exceeded the monthly budget.`,
        {
          limit: policy.monthlyBudgetUsd,
          current: current.toFixed(6),
          window: 'month',
        },
      );
    }
  }

  private async assertMonthlyTokenLimit(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string },
  ): Promise<void> {
    if (policy.monthlyTokenLimit === null) {
      return;
    }

    const current = await this.sumNumericColumn(
      input.tenantId,
      'totalTokens',
      30 * 24 * 60 * 60 * 1000,
    );
    if (current >= policy.monthlyTokenLimit) {
      throw new TenantPolicyLimitException(
        'tenant_monthly_token_limit_exceeded',
        `Tenant ${input.tenantId} exceeded the monthly token limit.`,
        {
          limit: policy.monthlyTokenLimit,
          current,
          window: 'month',
        },
      );
    }
  }

  private async assertImageRequestLimit(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string },
  ): Promise<void> {
    if (policy.imageRequestsPerMonth === null) {
      return;
    }

    const current = await this.usageEventRepository.count({
      where: {
        tenantId: input.tenantId,
        capability: 'image',
        createdAt: MoreThanOrEqual(
          this.buildLowerBoundDate(30 * 24 * 60 * 60 * 1000),
        ),
      },
    });
    if (current >= policy.imageRequestsPerMonth) {
      throw new TenantPolicyLimitException(
        'tenant_monthly_image_request_limit_exceeded',
        `Tenant ${input.tenantId} exceeded the monthly image request limit.`,
        {
          limit: policy.imageRequestsPerMonth,
          current,
          window: 'month',
        },
      );
    }
  }

  private buildLowerBoundDate(windowMs: number): Date {
    return new Date(Date.now() - windowMs);
  }

  private async sumNumericColumn(
    tenantId: string,
    column: 'costEstimateUsd' | 'totalTokens',
    windowMs: number,
  ): Promise<number> {
    const lowerBound = this.buildLowerBoundDate(windowMs);
    const result = await this.usageEventRepository
      .createQueryBuilder('usage_event')
      .select(`COALESCE(SUM(usage_event.${column}), 0)`, 'total')
      .where('usage_event.tenant_id = :tenantId', { tenantId })
      .andWhere('usage_event.created_at >= :lowerBound', { lowerBound })
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total ?? 0);
  }
}
