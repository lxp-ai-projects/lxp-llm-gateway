import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { SetupProviderTestRequestDto } from './dto/setup-provider-test-request.dto';
import { SetupProviderTestService } from './setup-provider-test.service';
import { SetupTokenGuard } from './setup-token.guard';

@Controller('setup/providers')
export class SetupController {
  constructor(
    private readonly setupProviderTestService: SetupProviderTestService,
  ) {}

  @Post('test')
  @UseGuards(SetupTokenGuard)
  testProvider(@Body() request: SetupProviderTestRequestDto) {
    return this.setupProviderTestService.testProvider(request);
  }
}
