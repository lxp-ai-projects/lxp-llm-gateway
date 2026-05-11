import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';

import { SetupBootstrapRequestDto } from './dto/setup-bootstrap-request.dto';
import { SetupBootstrapService } from './setup-bootstrap.service';
import { SetupStatusService } from './setup-status.service';
import { SetupTokenGuard } from './setup-token.guard';

@Controller('setup')
export class SetupController {
  constructor(
    private readonly setupStatusService: SetupStatusService,
    private readonly setupBootstrapService: SetupBootstrapService,
  ) {}

  @Get('status')
  getStatus() {
    return this.setupStatusService.getPublicSetupStatus();
  }

  @Post('bootstrap')
  @UseGuards(SetupTokenGuard)
  bootstrap(@Body() request: SetupBootstrapRequestDto) {
    return this.setupBootstrapService.bootstrap(request);
  }
}
