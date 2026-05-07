import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EntityManager,
  In,
  MoreThanOrEqual,
  Not,
  Repository,
} from 'typeorm';

import { MediaGenerationJobEntity } from '../persistence/entities/media-generation-job.entity';
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
  videoRequestsPerMonth: number | null;
  maxConcurrentVideoJobs: number | null;
  maxInputTokens: number | null;
  maxOutputTokens: number | null;
  allowPromptLogging: boolean;
  allowResponseLogging: boolean;
  retentionDays: number;
};

@Injectable()
export class TenantPolicyService {
  private static readonly blockedUsageStatuses = [
    'blocked_by_policy',
    'blocked_by_quota',
  ] as const;

  constructor(
    @InjectRepository(TenantPolicyEntity)
    private readonly tenantPolicyRepository: Repository<TenantPolicyEntity>,
    @InjectRepository(UsageEventEntity)
    private readonly usageEventRepository: Repository<UsageEventEntity>,
    @InjectRepository(MediaGenerationJobEntity)
    private readonly mediaGenerationJobRepository: Repository<MediaGenerationJobEntity>,
  ) {}

  async resolvePolicy(
    tenantId: string,
    manager?: EntityManager,
  ): Promise<ResolvedTenantPolicy> {
    const policy = await this.getTenantPolicyRepository(manager).findOne({
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
      videoRequestsPerMonth: policy?.videoRequestsPerMonth ?? null,
      maxConcurrentVideoJobs: policy?.maxConcurrentVideoJobs ?? null,
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
  }, manager?: EntityManager): Promise<ResolvedTenantPolicy> {
    const policy = await this.resolvePolicy(input.tenantId, manager);
    await this.assertRequestWindows(policy, input, manager);
    await this.assertMonthlyBudget(policy, input, manager);
    await this.assertMonthlyTokenLimit(policy, input, manager);
    return policy;
  }

  async assertImageRequestAllowed(input: {
    tenantId: string;
    providerId: string;
    model: string;
  }, manager?: EntityManager): Promise<ResolvedTenantPolicy> {
    const policy = await this.resolvePolicy(input.tenantId, manager);
    await this.assertRequestWindows(policy, input, manager);
    await this.assertMonthlyBudget(policy, input, manager);
    await this.assertImageRequestLimit(policy, input, manager);
    return policy;
  }

  async assertVideoRequestAllowed(input: {
    tenantId: string;
    providerId: string;
    model: string;
  }, manager?: EntityManager): Promise<ResolvedTenantPolicy> {
    const policy = await this.resolvePolicy(input.tenantId, manager);
    await this.assertRequestWindows(policy, input, manager);
    await this.assertMonthlyBudget(policy, input, manager);
    await this.assertVideoRequestLimit(policy, input, manager);
    await this.assertConcurrentVideoJobLimit(policy, input, manager);
    return policy;
  }

  private async assertRequestWindows(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string; providerId: string; model: string },
    manager?: EntityManager,
  ): Promise<void> {
    const usageEventRepository = this.getUsageEventRepository(manager);

    const lastMinuteCount = await usageEventRepository.count({
      where: {
        tenantId: input.tenantId,
        createdAt: MoreThanOrEqual(this.buildLowerBoundDate(60 * 1000)),
        status: Not(In(TenantPolicyService.blockedUsageStatuses)),
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
      this.buildLowerBoundDate(60 * 1000),
      manager,
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
      const lastDayCount = await usageEventRepository.count({
        where: {
          tenantId: input.tenantId,
          createdAt: MoreThanOrEqual(
            this.buildLowerBoundDate(24 * 60 * 60 * 1000),
          ),
          status: Not(In(TenantPolicyService.blockedUsageStatuses)),
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
      const lastMonthCount = await usageEventRepository.count({
        where: {
          tenantId: input.tenantId,
          createdAt: MoreThanOrEqual(this.buildStartOfMonthDate()),
          status: Not(In(TenantPolicyService.blockedUsageStatuses)),
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
    manager?: EntityManager,
  ): Promise<void> {
    if (policy.monthlyBudgetUsd === null) {
      return;
    }

    const current = await this.sumNumericColumn(
      input.tenantId,
      'costEstimateUsd',
      this.buildStartOfMonthDate(),
      manager,
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
    manager?: EntityManager,
  ): Promise<void> {
    if (policy.monthlyTokenLimit === null) {
      return;
    }

    const current = await this.sumNumericColumn(
      input.tenantId,
      'totalTokens',
      this.buildStartOfMonthDate(),
      manager,
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
    manager?: EntityManager,
  ): Promise<void> {
    if (policy.imageRequestsPerMonth === null) {
      return;
    }

    const current = await this.getUsageEventRepository(manager).count({
      where: {
        tenantId: input.tenantId,
        capability: 'image',
        createdAt: MoreThanOrEqual(this.buildStartOfMonthDate()),
        status: Not(In(TenantPolicyService.blockedUsageStatuses)),
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

  private async assertVideoRequestLimit(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string },
    manager?: EntityManager,
  ): Promise<void> {
    if (policy.videoRequestsPerMonth === null) {
      return;
    }

    const current = await this.getUsageEventRepository(manager).count({
      where: {
        tenantId: input.tenantId,
        capability: 'video',
        createdAt: MoreThanOrEqual(this.buildStartOfMonthDate()),
        status: Not(In(TenantPolicyService.blockedUsageStatuses)),
      },
    });
    if (current >= policy.videoRequestsPerMonth) {
      throw new TenantPolicyLimitException(
        'tenant_monthly_video_request_limit_exceeded',
        `Tenant ${input.tenantId} exceeded the monthly video request limit.`,
        {
          limit: policy.videoRequestsPerMonth,
          current,
          window: 'month',
        },
      );
    }
  }

  private async assertConcurrentVideoJobLimit(
    policy: ResolvedTenantPolicy,
    input: { tenantId: string },
    manager?: EntityManager,
  ): Promise<void> {
    if (policy.maxConcurrentVideoJobs === null) {
      return;
    }

    const current = await this.getMediaGenerationJobRepository(manager).count({
      where: {
        tenantId: input.tenantId,
        capability: 'video',
        status: In(['queued', 'running']),
      },
    });
    if (current >= policy.maxConcurrentVideoJobs) {
      throw new TenantPolicyLimitException(
        'tenant_concurrent_video_job_limit_exceeded',
        `Tenant ${input.tenantId} exceeded the concurrent video job limit.`,
        {
          limit: policy.maxConcurrentVideoJobs,
          current,
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
    lowerBound: Date,
    manager?: EntityManager,
  ): Promise<number> {
    const result = await this.getUsageEventRepository(manager)
      .createQueryBuilder('usage_event')
      .select(`COALESCE(SUM(usage_event.${column}), 0)`, 'total')
      .where('usage_event.tenant_id = :tenantId', { tenantId })
      .andWhere('usage_event.created_at >= :lowerBound', { lowerBound })
      .andWhere('usage_event.status NOT IN (:...blockedStatuses)', {
        blockedStatuses: TenantPolicyService.blockedUsageStatuses,
      })
      .getRawOne<{ total: string | number | null }>();

    return Number(result?.total ?? 0);
  }

  private buildStartOfMonthDate(): Date {
    const now = new Date();
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
    );
  }

  private getTenantPolicyRepository(
    manager?: EntityManager,
  ): Repository<TenantPolicyEntity> {
    return manager?.getRepository(TenantPolicyEntity) ?? this.tenantPolicyRepository;
  }

  private getUsageEventRepository(
    manager?: EntityManager,
  ): Repository<UsageEventEntity> {
    return manager?.getRepository(UsageEventEntity) ?? this.usageEventRepository;
  }

  private getMediaGenerationJobRepository(
    manager?: EntityManager,
  ): Repository<MediaGenerationJobEntity> {
    return manager?.getRepository(MediaGenerationJobEntity) ??
      this.mediaGenerationJobRepository;
  }
}
