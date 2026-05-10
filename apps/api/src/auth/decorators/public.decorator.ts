import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as publicly accessible — skips JwtAuthGuard and PermissionsGuard.
 *
 * Use sparingly. Every unauthenticated endpoint is a potential attack surface.
 * Required on: login, refresh, logout (cookie clearing), health probes.
 *
 * @example
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
