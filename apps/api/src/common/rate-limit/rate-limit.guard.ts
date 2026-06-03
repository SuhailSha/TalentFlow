import {
  CanActivate,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import type Redis from 'ioredis';

import { STREAMS_REDIS } from '../../events/streams.publisher';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.types';

/**
 * Per-tenant rate limiter — TF-1-9.
 *
 * Why a custom guard instead of @nestjs/throttler:
 *   - We already run Redis; one fewer dependency.
 *   - Throttler's per-tenant key generator requires its own Redis client
 *     plus a strategy. The marginal complexity exceeds writing our own.
 *   - Our scoping (orgId + route key + window) is straightforward to
 *     express in a single Lua-atomic INCR + EXPIRE.
 *
 * Key shape:
 *   t:{orgId}:rl:{routeKey}:{windowEpoch}
 *
 * Window epoch is the floor(currentSec / windowSec). When the window
 * advances, the counter resets organically because the key changes.
 *
 * Algorithm:
 *   1. INCR key (atomic — first increment returns 1).
 *   2. If result is 1, EXPIRE key for windowSec.
 *   3. If result > max → 429 with Retry-After = remaining window.
 *
 * Unauthenticated routes (no tenant) fall back to IP-based scoping.
 * If Redis is disabled, the guard is a no-op with a warn log — dev
 * convenience; production rejects REDIS_ENABLED=false at boot.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(STREAMS_REDIS) private readonly redis: Redis | null,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );
    if (!opts) return true;   // No limit configured for this route
    if (!this.redis) {
      // Dev with REDIS_ENABLED=false. Production cannot reach here per
      // env-schema super-refine; warn once per process.
      if (!RateLimitGuard.warned) {
        this.logger.warn('Rate limiting disabled (no Redis client). Production must run with Redis.');
        RateLimitGuard.warned = true;
      }
      return true;
    }

    const req = ctx.switchToHttp().getRequest<Request & { user?: { organizationId?: string; userId?: string } }>();
    const res = ctx.switchToHttp().getResponse<Response>();
    const scope = this.scopeKey(req);
    const now = Math.floor(Date.now() / 1000);
    const windowEpoch = Math.floor(now / opts.windowSec);
    const key = `${scope}:rl:${opts.routeKey}:${windowEpoch}`;

    // INCR is atomic; first hit returns 1 and we then set TTL.
    const count = await this.redis.incr(key);
    if (count === 1) {
      // First request in this window; set TTL to expire just after window
      // closes. We add 1s safety so concurrent increments don't race
      // with the EXPIRE.
      await this.redis.expire(key, opts.windowSec + 1);
    }

    // Standard headers for clients to back off.
    const remaining = Math.max(0, opts.max - count);
    res.setHeader('X-RateLimit-Limit',     String(opts.max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Window',    String(opts.windowSec));

    if (count > opts.max) {
      const ttl = await this.redis.ttl(key);
      const retryAfter = Math.max(1, ttl);
      res.setHeader('Retry-After', String(retryAfter));
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: `Too many requests for ${opts.routeKey}. Try again in ${retryAfter}s.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /**
   * Build the Redis key scope. Authenticated requests are tenant-scoped
   * (`t:<orgId>`); unauthenticated fall back to IP. We deliberately
   * don't combine — within a tenant the limit is global per tenant; for
   * anonymous traffic, we limit per IP.
   */
  private scopeKey(req: Request & { user?: { organizationId?: string } }): string {
    const orgId = req.user?.organizationId;
    if (orgId) return `t:${orgId}`;
    // Trust X-Forwarded-For only when configured upstream (Cloudflare,
    // ALB). Express handles this when `app.set('trust proxy', ...)` is
    // enabled in main.ts. Here we read req.ip which respects that
    // setting; fall back to req.socket.remoteAddress for hardening.
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    return `anon:${ip}`;
  }

  private static warned = false;
}

/**
 * Decorator: attach a rate-limit policy to a route or controller.
 *
 * @example
 *   @RateLimit({ max: 60, windowSec: 60, routeKey: 'candidates.create' })
 *   @Post()
 *   create() { ... }
 */
export const RateLimit = (opts: RateLimitOptions): MethodDecorator & ClassDecorator =>
  SetMetadata(RATE_LIMIT_KEY, opts);
