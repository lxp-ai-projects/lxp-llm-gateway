import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  InstallationStateEntity,
  INSTALLATION_STATE_SINGLETON_ID,
} from '../persistence/entities/installation-state.entity';
import { RoleEntity } from '../persistence/entities/role.entity';
import { UserRoleEntity } from '../persistence/entities/user-role.entity';

export interface PublicSetupStatus {
  setupRequired: boolean;
  setupCompleted: boolean;
  tokenRequired: boolean;
  version: string | null;
}

@Injectable()
export class SetupStatusService {
  constructor(
    @InjectRepository(InstallationStateEntity)
    private readonly installationStateRepository: Repository<InstallationStateEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly userRoleRepository: Repository<UserRoleEntity>,
  ) {}

  async ensureInstallationState(): Promise<InstallationStateEntity> {
    const existingState = await this.installationStateRepository.findOne({
      where: { id: INSTALLATION_STATE_SINGLETON_ID },
    });
    const superAdminUserId = await this.findSuperAdminUserId();

    if (existingState) {
      if (existingState.status !== 'COMPLETED' && superAdminUserId) {
        existingState.status = 'COMPLETED';
        existingState.setupCompletedAt =
          existingState.setupCompletedAt ?? new Date();
        existingState.completedByUserId =
          existingState.completedByUserId ?? superAdminUserId;
        existingState.appVersion =
          existingState.appVersion ?? this.resolveAppVersion();
        return this.installationStateRepository.save(existingState);
      }

      return existingState;
    }
    const now = new Date();

    return this.installationStateRepository.save(
      this.installationStateRepository.create({
        id: INSTALLATION_STATE_SINGLETON_ID,
        status: superAdminUserId ? 'COMPLETED' : 'PENDING',
        setupStartedAt: null,
        setupCompletedAt: superAdminUserId ? now : null,
        completedByUserId: superAdminUserId,
        appVersion: this.resolveAppVersion(),
      }),
    );
  }

  async getPublicSetupStatus(): Promise<PublicSetupStatus> {
    let state: InstallationStateEntity;
    try {
      state = await this.ensureInstallationState();
    } catch (error) {
      if (isMissingRelationError(error)) {
        return {
          setupRequired: true,
          setupCompleted: false,
          tokenRequired: true,
          version: this.resolveAppVersion(),
        };
      }

      throw error;
    }
    const setupCompleted = state.status === 'COMPLETED';

    return {
      setupRequired: !setupCompleted,
      setupCompleted,
      tokenRequired: true,
      version: state.appVersion ?? this.resolveAppVersion(),
    };
  }

  private async findSuperAdminUserId(): Promise<string | null> {
    const superAdminRole = await this.roleRepository.findOne({
      where: { name: 'super_admin' },
    });
    if (!superAdminRole) {
      return null;
    }

    const assignments = await this.userRoleRepository.find({
      where: {
        roleId: superAdminRole.id,
      },
    });

    return assignments[0]?.userId ?? null;
  }

  private resolveAppVersion(): string | null {
    const version = process.env.npm_package_version?.trim();
    return version && version.length > 0 ? version : null;
  }
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    driverError?: {
      code?: unknown;
      message?: unknown;
    };
  };
  const errorCode = candidate.driverError?.code ?? candidate.code;
  const errorMessage =
    candidate.driverError?.message ?? candidate.message ?? '';

  return (
    errorCode === '42P01' ||
    (typeof errorMessage === 'string' &&
      errorMessage.includes('relation "installation_state" does not exist'))
  );
}
