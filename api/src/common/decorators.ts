import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skip the login check for a route */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Only these roles can call the route (RolesGuard) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** The logged in user, set by AuthGuard */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

/** Trim string fields before validation */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
