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
import { CreateProviderCredentialDto } from './admin/dto/create-provider-credential.dto';
import { CreateUserDto } from './admin/dto/create-user.dto';
import { StoreProviderCredentialDto } from './admin/dto/store-provider-credential.dto';
import { UpdateProviderCredentialDto } from './admin/dto/update-provider-credential.dto';
import { UpdateProviderSettingsDto } from './admin/dto/update-provider-settings.dto';
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
