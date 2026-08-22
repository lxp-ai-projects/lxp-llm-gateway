import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AccessTokenGuard } from '../auth/access-token.guard';
import type { RequestWithAuthUser } from '../auth/auth-request.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EvaluationProbeDto } from './dto/evaluation-probe.dto';
import { EvaluationLabService } from './evaluation-lab.service';

@Controller('admin')
@UseGuards(AccessTokenGuard, RolesGuard)
@Roles('operator', 'tenant_admin')
export class EvaluationLabController {
  constructor(private readonly evaluationLab: EvaluationLabService) {}

  @Get('evaluation-profiles')
  listProfiles(@Req() request: Request & RequestWithAuthUser) {
    return this.evaluationLab.listProfiles(request.authUser!);
  }

  @Post('evaluation-probes')
  executeProbe(
    @Req() request: Request & RequestWithAuthUser,
    @Body() dto: EvaluationProbeDto,
  ) {
    const requestId = request.headers['x-request-id'];
    return this.evaluationLab.executeProbe(
      request.authUser!,
      dto,
      typeof requestId === 'string' ? requestId : undefined,
    );
  }
}
