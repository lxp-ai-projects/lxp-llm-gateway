import { Body, Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';

import { GatewayAuthService } from '../auth/gateway-auth.service';
import { EvaluationRequestDto } from './dto/evaluation-request.dto';
import { EvaluationReadinessRequestDto } from './dto/evaluation-readiness-request.dto';
import { EvaluationService } from './evaluation.service';

@Controller('evaluations')
export class EvaluationController {
  constructor(
    private readonly evaluations: EvaluationService,
    private readonly auth: GatewayAuthService,
  ) {}

  @Post()
  async evaluate(
    @Body() request: EvaluationRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req() httpRequest: Request,
  ) {
    const authContext = await this.auth.authenticateIntegrationClientRequest(
      authorizationHeader,
      httpRequest.headers,
    );
    return this.evaluations.evaluate(request, authContext);
  }

  @Post('readiness')
  async readiness(
    @Body() request: EvaluationReadinessRequestDto,
    @Headers('authorization') authorizationHeader: string | undefined,
    @Req() httpRequest: Request,
  ) {
    const authContext = await this.auth.authenticateIntegrationClientRequest(
      authorizationHeader,
      httpRequest.headers,
    );
    return this.evaluations.readiness(request, authContext);
  }
}
