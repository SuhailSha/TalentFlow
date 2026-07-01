import { Global, Module } from '@nestjs/common';

import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagsService } from './feature-flags.service';

/**
 * Feature flags module (TF-1-7). @Global so any service can inject
 * FeatureFlagsService without re-importing the module.
 */
@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers:   [FeatureFlagsService],
  exports:     [FeatureFlagsService],
})
export class FeatureFlagsModule {}
