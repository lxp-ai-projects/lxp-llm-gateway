import { Controller, Get } from '@nestjs/common';

@Controller()
export class AdminController {
  @Get('health')
  getHealth() {
    return {
      service: 'admin-api',
      status: 'ok',
    };
  }
}
