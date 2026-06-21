import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../types';

/** Extrae el usuario autenticado del request. Requiere JwtAuthGuard previo. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    return request.user;
  },
);
