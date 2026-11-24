import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { COOKIE_NAME } from './auth.constants';

/**
 * Global guard. Reads the JWT from the cookie, loads the user from the db
 * (so role changes apply straight away) and returns 401 unless the route is @Public().
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const token: string | undefined = req.cookies?.[COOKIE_NAME];

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: { id: true, email: true, name: true, role: true },
        });
        if (user) req.user = user;
      } catch {
        // bad or expired token, same as no token
      }
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    if (!req.user) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Please log in to continue',
      });
    }
    return true;
  }
}

/** Role check on the server. Hiding buttons in the UI is not real protection. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles) return true;

    const user = ctx.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do this',
      });
    }
    return true;
  }
}
