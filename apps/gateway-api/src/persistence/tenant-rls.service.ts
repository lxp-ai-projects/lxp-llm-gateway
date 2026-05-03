import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';

@Injectable()
export class TenantRlsService {
  constructor(private readonly dataSource: DataSource) {}

  async withTenantContext<T>(
    tenantId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.withContext({ tenantId }, work);
  }

  async withTenantLockContext<T>(
    tenantId: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.withContext({ tenantId }, async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1)::bigint)',
        [`tenant:${tenantId}`],
      );
      return work(manager);
    });
  }

  async withApiKeyHashContext<T>(
    apiKeyHash: string,
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.withContext({ apiKeyHash }, work);
  }

  async setTenantContext(
    manager: EntityManager,
    tenantId: string,
  ): Promise<void> {
    await this.setContextValue(manager, 'app.tenant_id', tenantId);
  }

  async setApiKeyHashContext(
    manager: EntityManager,
    apiKeyHash: string,
  ): Promise<void> {
    await this.setContextValue(manager, 'app.api_key_hash', apiKeyHash);
  }

  private async withContext<T>(
    context: {
      tenantId?: string;
      apiKeyHash?: string;
    },
    work: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      if (context.apiKeyHash) {
        await this.setApiKeyHashContext(manager, context.apiKeyHash);
      }
      if (context.tenantId) {
        await this.setTenantContext(manager, context.tenantId);
      }

      return work(manager);
    });
  }

  private async setContextValue(
    manager: EntityManager,
    key: 'app.tenant_id' | 'app.api_key_hash',
    value: string,
  ): Promise<void> {
    await manager.query(`SELECT set_config($1, $2, true)`, [key, value]);
  }
}
