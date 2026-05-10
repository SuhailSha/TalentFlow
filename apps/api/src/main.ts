import 'reflect-metadata';

import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import type { EnvConfig } from './config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS default logger — pino takes over via useLogger()
    bufferLogs: true,
  });

  // Replace NestJS logger with pino
  const logger = app.get(Logger);
  app.useLogger(logger);

  const config = app.get(ConfigService<EnvConfig, true>);
  const port = config.get('PORT');
  const apiPrefix = config.get('API_PREFIX');
  const corsOrigin = config.get('CORS_ORIGIN');
  const nodeEnv = config.get('NODE_ENV');

  // Request ID — must run after pino-http (which sets req.id) but before routes.
  // Registered here rather than via MiddlewareConsumer to avoid path-to-regexp
  // wildcard warnings introduced in NestJS 11 / path-to-regexp v8.
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.requestId = String(req.id ?? crypto.randomUUID());
    res.setHeader('X-Request-ID', req.requestId);
    next();
  });

  // Cookie parsing — must run before any guard that reads req.cookies.
  // No secret needed: cookies are verified by JWT signature, not cookie signing.
  app.use(cookieParser());

  // Security
  app.use(helmet());
  app.use(compression());

  // CORS — allow comma-separated origins from env
  const origins = corsOrigin.split(',').map((o: string) => o.trim());
  app.enableCors({
    origin: origins.length === 1 ? origins[0] : origins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // Global prefix + URI versioning → /api/v1/...
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Input validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  logger.log(`🚀 API running on port ${port} [${nodeEnv}]`, 'Bootstrap');
  logger.log(`   Health: http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap().catch((err: unknown) => {
  console.error('Fatal: failed to start application', err);
  process.exit(1);
});
