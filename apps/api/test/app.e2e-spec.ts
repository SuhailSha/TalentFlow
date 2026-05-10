import { type INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module';

describe('Health endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ bufferLogs: true });

    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health/liveness', () => {
    it('returns 200', async () => {
      const res = await request(app.getHttpServer()).get('/health/liveness');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('GET /health', () => {
    it('returns 200 when database is connected', async () => {
      const res = await request(app.getHttpServer()).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'ok' });
    });
  });

  describe('GET /health/info', () => {
    it('returns API info', async () => {
      const res = await request(app.getHttpServer()).get('/health/info');
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ name: 'Recruitment Platform API' });
    });
  });

  describe('Error handling', () => {
    it('returns standardized error shape for 404', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({
        success: false,
        error: { code: expect.any(String), message: expect.any(String) },
        requestId: expect.any(String),
        timestamp: expect.any(String),
      });
    });

    it('sets X-Request-ID header', async () => {
      const res = await request(app.getHttpServer()).get('/health/liveness');
      expect(res.headers['x-request-id']).toBeDefined();
    });
  });
});
