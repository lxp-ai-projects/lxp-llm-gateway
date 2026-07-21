import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { TenantEntity } from '../persistence/entities/tenant.entity';
import { TenantPublicHostEntity } from '../persistence/entities/tenant-public-host.entity';
import { TenantRegistrationSettingsEntity } from '../persistence/entities/tenant-registration-settings.entity';
import { CreateTenantPublicHostDto } from './dto/create-tenant-public-host.dto';
import { UpdateTenantPublicHostDto } from './dto/update-tenant-public-host.dto';
import { UpdateTenantRegistrationSettingsDto } from './dto/update-tenant-registration-settings.dto';
import { normalizePublicHostname } from './tenant-public-host-resolver.service';

@Injectable()
export class TenantRegistrationService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepository: Repository<TenantEntity>,
    @InjectRepository(TenantPublicHostEntity)
    private readonly hostRepository: Repository<TenantPublicHostEntity>,
    @InjectRepository(TenantRegistrationSettingsEntity)
    private readonly settingsRepository: Repository<TenantRegistrationSettingsEntity>,
  ) {}

  async getSettings(tenantId: string) {
    await this.assertTenant(tenantId);
    return this.getOrCreateSettings(tenantId);
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantRegistrationSettingsDto,
  ) {
    const settings = await this.getSettings(tenantId);
    settings.enabled = dto.enabled;
    return this.settingsRepository.save(settings);
  }

  async listHosts(tenantId: string) {
    await this.assertTenant(tenantId);
    return this.hostRepository.find({
      where: { tenantId },
      order: { hostname: 'ASC' },
    });
  }

  async createHost(tenantId: string, dto: CreateTenantPublicHostDto) {
    await this.assertTenant(tenantId);
    const hostname = normalizePublicHostname(dto.hostname);
    if (!hostname) {
      throw new ConflictException('A valid DNS hostname is required.');
    }
    const existing = await this.hostRepository.findOne({ where: { hostname } });
    if (existing) {
      throw new ConflictException('This public hostname is already assigned.');
    }
    if (dto.isPrimary) {
      await this.hostRepository.update({ tenantId }, { isPrimary: false });
    }
    return this.hostRepository.save(
      this.hostRepository.create({
        tenantId,
        hostname,
        isPrimary: dto.isPrimary ?? false,
        enabled: dto.enabled ?? true,
      }),
    );
  }

  async updateHost(
    tenantId: string,
    hostId: string,
    dto: UpdateTenantPublicHostDto,
  ) {
    const host = await this.hostRepository.findOne({
      where: { id: hostId, tenantId },
    });
    if (!host) throw new NotFoundException('Public hostname not found.');
    if (dto.isPrimary)
      await this.hostRepository.update({ tenantId }, { isPrimary: false });
    Object.assign(host, dto);
    return this.hostRepository.save(host);
  }

  async deleteHost(tenantId: string, hostId: string) {
    const result = await this.hostRepository.delete({ id: hostId, tenantId });
    if (!result.affected)
      throw new NotFoundException('Public hostname not found.');
  }

  async resolvePublicContext(hostname: string | null) {
    let tenant: TenantEntity | null = null;
    if (hostname) {
      const host = await this.hostRepository.findOne({
        where: { hostname, enabled: true },
        relations: { tenant: true },
      });
      if (host?.tenant.status === 'active') tenant = host.tenant;
    }
    if (!tenant) {
      const activeTenants = await this.tenantRepository.find({
        where: { status: 'active' },
        take: 2,
      });
      if (activeTenants.length === 1) tenant = activeTenants[0];
    }
    if (!tenant) return { registrationEnabled: false, tenant: null };
    const settings = await this.getOrCreateSettings(tenant.id);
    return {
      registrationEnabled:
        process.env.LXP_REGISTRATION_ENABLED === 'true' && settings.enabled,
      tenant: { slug: tenant.slug, displayName: tenant.displayName },
    };
  }

  private async getOrCreateSettings(tenantId: string) {
    const existing = await this.settingsRepository.findOne({
      where: { tenantId },
    });
    return (
      existing ??
      this.settingsRepository.save(
        this.settingsRepository.create({ tenantId, enabled: false }),
      )
    );
  }

  private async assertTenant(tenantId: string) {
    const tenant = await this.tenantRepository.findOne({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');
    return tenant;
  }
}
