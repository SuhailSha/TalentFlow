import { type DynamicModule, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvConfig } from '../config';
import { STORAGE_PROVIDER } from './storage.constants';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { StorageService } from './storage.service';

const logger = new Logger('StorageModule');

/**
 * StorageModule — pluggable file storage infrastructure.
 *
 * Architecture:
 *   The module uses the STORAGE_DRIVER env var to select a provider at startup:
 *     STORAGE_DRIVER=local  → LocalStorageProvider (filesystem, default in dev)
 *     STORAGE_DRIVER=s3     → S3StorageProvider    (AWS S3, required in prod)
 *
 *   The provider is bound to the STORAGE_PROVIDER injection token.
 *   StorageService injects STORAGE_PROVIDER — it's provider-agnostic.
 *
 * Adding a new provider (e.g. GCS):
 *   1. Create GcsStorageProvider implementing IStorageProvider
 *   2. Add 'gcs' to the STORAGE_DRIVER enum in env.schema.ts
 *   3. Add a case in the factory below
 *   No other changes needed.
 *
 * Global:
 *   StorageModule is @Global() so StorageService can be injected anywhere
 *   without re-importing the module.
 *
 * Testing:
 *   In unit tests: provide a mock implementing IStorageProvider.
 *   In integration tests: use LocalStorageProvider with a temp directory.
 *   Never test against real S3 in unit tests — use LocalStack if needed.
 */
@Module({})
export class StorageModule {
  static register(): DynamicModule {
    return {
      module: StorageModule,
      global: true,
      providers: [
        {
          provide:    STORAGE_PROVIDER,
          inject:     [ConfigService],
          useFactory: (config: ConfigService<EnvConfig, true>) => {
            const driver = config.get('STORAGE_DRIVER', { infer: true });

            switch (driver) {
              case 'local':
                logger.log('Storage driver: local (filesystem)');
                return new LocalStorageProvider(config);

              case 's3':
                // S3StorageProvider is implemented in Phase 2 (resume upload feature).
                // Placeholder: importing here would require @aws-sdk/client-s3.
                logger.error('S3 storage driver selected but S3StorageProvider not yet implemented.');
                throw new Error('S3 storage driver not yet implemented. Use STORAGE_DRIVER=local.');

              default:
                throw new Error(`Unknown STORAGE_DRIVER: "${String(driver)}". Valid: local, s3`);
            }
          },
        },
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}
