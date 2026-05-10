import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    // pino-http sets req.id before this middleware runs
    req.requestId = String(req.id);
    res.setHeader('X-Request-ID', req.requestId);
    next();
  }
}
