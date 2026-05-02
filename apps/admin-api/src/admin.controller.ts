import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AdminService } from './admin/admin.service';
import { BootstrapAdminDto } from './admin/dto/bootstrap-admin.dto';
import { CreateTenantDto } from './admin/dto/create-tenant.dto';
import { CreateTenantMembershipDto } from './admin/dto/create-tenant-membership.dto';
import { CreateProviderCredentialDto } from './admin/dto/create-provider-credential.dto';
import { CreateUserDto } from './admin/dto/create-user.dto';
import { StoreProviderCredentialDto } from './admin/dto/store-provider-credential.dto';
import { UpdateTenantDto } from './admin/dto/update-tenant.dto';
import { UpdateProviderCredentialDto } from './admin/dto/update-provider-credential.dto';
import { UpdateProviderSettingsDto } from './admin/dto/update-provider-settings.dto';
import { UpdateGlobalRolesDto } from './admin/dto/update-global-roles.dto';
import { UpdateUserDto } from './admin/dto/update-user.dto';
import { AccessTokenGuard } from './auth/access-token.guard';
import type { RequestWithAuthUser } from './auth/auth-request.types';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('bootstrap/admin')
  bootstrapAdmin(@Body() dto: BootstrapAdminDto) {
    return this.adminService.bootstrapAdmin(dto);
  }

  @Post('admin/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  createUser(@Req() request: RequestWithAuthUser, @Body() dto: CreateUserDto) {
    return this.adminService.createUser(request.authUser!, dto);
  }

  @Get('admin/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  listUsers(@Req() request: RequestWithAuthUser) {
    return this.adminService.listUsers(request.authUser!);
  }

  @Get('admin/tenants')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenants() {
    return this.adminService.listTenants();
  }

  @Post('admin/tenants')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.adminService.createTenant(dto);
  }

  @Patch('admin/tenants/:tenantId')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenant(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateTenantDto,
  ) {
    return this.adminService.updateTenant(tenantId, dto);
  }

  @Post('admin/tenants/:tenantId/users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  createTenantUser(
    @Param('tenantId') tenantId: string,
    @Body() dto: CreateTenantMembershipDto,
  ) {
    return this.adminService.createTenantUser(tenantId, dto);
  }

  @Patch('admin/tenants/:tenantId/users/:userUuid')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateTenantUser(
    @Param('tenantId') tenantId: string,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateTenantUser(tenantId, userUuid, dto);
  }

  @Patch('admin/users/:userUuid/global-roles')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  updateUserGlobalRoles(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateGlobalRolesDto,
  ) {
    return this.adminService.updateUserGlobalRoles(
      request.authUser!,
      userUuid,
      dto,
    );
  }

  @Get('admin/tenants/:tenantId/memberships')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('super_admin')
  listTenantMemberships(@Param('tenantId') tenantId: string) {
    return this.adminService.listTenantMemberships(tenantId);
  }

  @Patch('admin/users/:userUuid')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  updateUser(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminService.updateUser(request.authUser!, userUuid, dto);
  }

  @Post('admin/provider-credentials')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin', 'operator')
  storeProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Body() dto: StoreProviderCredentialDto,
  ) {
    return this.adminService.storeProviderCredentialForActor(
      request.authUser!,
      dto,
    );
  }

  @Get('admin/users/:userUuid/provider-credentials')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('tenant_admin')
  listUserProviderCredentials(
    @Req() request: RequestWithAuthUser,
    @Param('userUuid') userUuid: string,
  ) {
    return this.adminService.listProviderCredentialsForUser(
      request.authUser!,
      userUuid,
    );
  }

  @Get('provider-credentials')
  @UseGuards(AccessTokenGuard)
  listOwnProviderCredentials(@Req() request: RequestWithAuthUser) {
    return this.adminService.listProviderCredentialsForUser(
      request.authUser!,
      request.authUser!.userUuid,
    );
  }

  @Patch('provider-credentials/:credentialId')
  @UseGuards(AccessTokenGuard)
  updateOwnProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Param('credentialId') credentialId: string,
    @Body() dto: UpdateProviderCredentialDto,
  ) {
    return this.adminService.updateOwnProviderCredential(
      request.authUser!,
      credentialId,
      dto,
    );
  }

  @Post('provider-credentials')
  @UseGuards(AccessTokenGuard)
  createProviderCredential(
    @Req() request: RequestWithAuthUser,
    @Body() dto: CreateProviderCredentialDto,
  ) {
    return this.adminService.storeProviderCredentialForActor(
      request.authUser!,
      {
        ...dto,
        userUuid: dto.userUuid ?? request.authUser!.userUuid,
      },
    );
  }

  @Get('provider-settings')
  @UseGuards(AccessTokenGuard)
  getOwnProviderSettings(@Req() request: RequestWithAuthUser) {
    return this.adminService.getProviderSettingsForUser(
      request.authUser!,
      request.authUser!.userUuid,
    );
  }

  @Patch('provider-settings')
  @UseGuards(AccessTokenGuard)
  updateOwnProviderSettings(
    @Req() request: RequestWithAuthUser,
    @Body() dto: UpdateProviderSettingsDto,
  ) {
    return this.adminService.updateProviderSettingsForUser(
      request.authUser!,
      request.authUser!.userUuid,
      dto,
    );
  }
}
