import { Body, Controller, Post } from '@nestjs/common';

import { AdminService } from './admin/admin.service';
import { CreateUserDto } from './admin/dto/create-user.dto';
import { StoreProviderCredentialDto } from './admin/dto/store-provider-credential.dto';

@Controller()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('admin/users')
  createUser(@Body() dto: CreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Post('admin/provider-credentials')
  storeProviderCredential(@Body() dto: StoreProviderCredentialDto) {
    return this.adminService.storeProviderCredential(dto);
  }
}
