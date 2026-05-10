import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';

import { AppContextService } from '../../common/context/app-context.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { RequestUser } from '../types/request-user.interface';

/**
 * Global JWT guard — applied to every route via APP_GUARD in AppModule.
 *
 * Routes decorated with @Public() are opted out: the guard returns true
 * immediately without validating any token. All other routes require a
 * valid access_token cookie; missing or expired tokens yield 401.
 *
 * After successful validation, the guard:
 *   1. Attaches the RequestUser to req.user (done by PassportStrategy.validate)
 *   2. Copies the user into the CLS store (AppContextService) so services
 *      can access tenant context without drilling the Request object.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly reflector: Reflector,
    private readonly appContext: AppContextService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<T extends RequestUser>(err: Error | null, user: T | false): T {
    if (err || !user) {
      throw err ?? new UnauthorizedException('Authentication required');
    }

    // Populate CLS store — available to all services for this request.
    this.appContext.setUser(user);

    return user;
  }
}
