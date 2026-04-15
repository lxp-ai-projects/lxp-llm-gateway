import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { AdminService } from './admin/admin.service';
import { BootstrapAdminDto } from './admin/dto/bootstrap-admin.dto';
import { CreateUserDto } from './admin/dto/create-user.dto';
import { StoreProviderCredentialDto } from './admin/dto/store-provider-credential.dto';
import { AccessTokenGuard } from './auth/access-token.guard';
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
  @Roles('admin')
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Post('admin/provider-credentials')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles('admin', 'operator')
  storeProviderCredential(@Body() dto: StoreProviderCredentialDto) {
    return this.adminService.storeProviderCredential(dto);
  }
}
