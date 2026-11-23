import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Role } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
/** Skip the login requirement for a route. Everything else needs a valid cookie. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Only these roles may call the route (checked on the server by RolesGuard). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/** The logged-in user, put on the request by AuthGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user,
);

/** Trim whitespace on string DTO fields before validation. */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
