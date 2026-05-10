import { Module } from '@nestjs/common';

import { VendorsController } from './vendors.controller';
import { VendorsRepository } from './vendors.repository';
import { VendorsService } from './vendors.service';

// EventEmitterModule, WorkflowModule (FsmService), AppContextModule are all
// @Global() — no need to import them here.

@Module({
  controllers: [VendorsController],
  providers:   [VendorsService, VendorsRepository],
  exports:     [VendorsService],
})
export class VendorsModule {}
