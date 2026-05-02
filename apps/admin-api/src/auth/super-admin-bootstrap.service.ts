import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RoleEntity } from '../persistence/entities/role.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';
import { UserEntity } from '../persistence/entities/user.entity';
import { EmailProtectionService } from '../security/email-protection.service';

@Injectable()
export class SuperAdminBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperAdminBootstrapService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
    private readonly emailProtectionService: EmailProtectionService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.syncConfiguredSuperAdmins();
  }

  async syncUserIfConfigured(user: Pick<UserEntity, 'id' | 'emailHash'>): Promise<void> {
    const configuredHashes = this.getConfiguredSuperAdminEmailHashes();
    if (!configuredHashes.has(user.emailHash)) {
      return;
    }

    await this.ensureSuperAdminRole(user.id);
  }

  private async syncConfiguredSuperAdmins(): Promise<void> {
    const configuredHashes = this.getConfiguredSuperAdminEmailHashes();
    if (!configuredHashes.size) {
      return;
    }

    const users = await this.userRepository.find();
    const matchingUsers = users.filter((user) => configuredHashes.has(user.emailHash));
    if (!matchingUsers.length) {
      this.logger.log(
        'No configured super-admin users were found in the current database snapshot.',
      );
      return;
    }

    for (const user of matchingUsers) {
      await this.ensureSuperAdminRole(user.id);
    }
  }

  private async ensureSuperAdminRole(userId: string): Promise<void> {
    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'super_admin' },
    });
    if (!superAdminRole) {
      this.logger.warn(
        'Skipping configured super-admin assignment because the role definition is missing.',
      );
      return;
    }

    const existingAssignment = await this.userRoleRepository.findOne({
      where: {
        userId,
        roleId: superAdminRole.id,
      },
    });
    if (existingAssignment) {
      return;
    }

    await this.userRoleRepository.save(
      this.userRoleRepository.create({
        userId,
        roleId: superAdminRole.id,
      }),
    );
    this.logger.log(`Assigned global super_admin role to user ${userId}.`);
  }

  private getConfiguredSuperAdminEmailHashes(): Set<string> {
    const configuredEmails = (process.env.LXP_SUPER_ADMIN_EMAILS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    return new Set(
      configuredEmails.map(
        (email) => this.emailProtectionService.protect(email).emailHash,
      ),
    );
  }
}
