import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import type { RequestUser } from '../types/request-user.interface';

/**
 * Extracts the authenticated user from the request.
 *
 * Populated by JwtAuthGuard → JwtStrategy.validate() → req.user.
 * Always defined on authenticated routes; undefined if somehow used on @Public() routes.
 *
 * @example
 *   @Get('profile')
 *   getProfile(@CurrentUser() user: RequestUser) {
 *     return user.userId;
 *   }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
    return request.user;
  },
);
