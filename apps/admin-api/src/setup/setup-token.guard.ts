import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { SetupAccessService } from './setup-access.service';

@Injectable()
export class SetupTokenGuard implements CanActivate {
  constructor(private readonly setupAccessService: SetupAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const headerValue = request.headers['x-setup-token'];
    const token = Array.isArray(headerValue) ? headerValue[0] : headerValue;

    await this.setupAccessService.verifySetupToken(token);
    return true;
  }
}

