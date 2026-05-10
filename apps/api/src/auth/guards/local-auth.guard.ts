import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Triggers LocalStrategy.validate() on the login endpoint.
 * Applied only to POST /auth/login (not globally).
 */
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}
