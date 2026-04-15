import type { ExecutionContext } from '@nestjs/common';
import { CanActivate, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestWithAuthUser } from './auth-request.types';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithAuthUser>();
    const authUser = request.authUser;
    if (!authUser) {
      throw new ForbiddenException('Missing authenticated user context.');
    }

    const hasRole = requiredRoles.some((requiredRole) =>
      authUser.roles.includes(requiredRole),
    );
    if (!hasRole) {
      throw new ForbiddenException('Insufficient role for this resource.');
    }

    return true;
  }
}
