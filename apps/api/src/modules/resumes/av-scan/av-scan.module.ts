import { Module } from '@nestjs/common';

import { AV_SCANNER, AvScanService } from './av-scan.service';
import { LocalScanProvider } from './local-scan.provider';

/**
 * AvScanModule (TF-1-16).
 *
 * Provider selection is env-driven — today `LocalScanProvider` is the
 * only implementation. Switching to ClamAV in staging is a one-line
 * change here.
 */
@Module({
  providers: [
    LocalScanProvider,
    AvScanService,
    { provide: AV_SCANNER, useExisting: LocalScanProvider },
  ],
  exports: [AvScanService],
})
export class AvScanModule {}
