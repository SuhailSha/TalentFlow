import { Injectable, Logger } from '@nestjs/common';

import type { AvScanner, ScanRequest, ScanVerdict } from './av-scanner.interface';

/**
 * Development / self-hosted AV scanner (TF-1-16).
 *
 * Not a real virus scanner. Recognizes the EICAR test string (industry-
 * standard proof that AV plumbing works) and rejects it. Everything
 * else is passed. Production deployments MUST switch to
 * `ClamAVScanner`; the env schema will grow a `AV_SCANNER=clamav|local`
 * gate before customer traffic.
 *
 * EICAR: https://www.eicar.org/download-anti-malware-testfile/
 * The signature is `X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*`.
 * If those bytes appear in the first 512 bytes of a file, we flag it.
 */

// Not exported; keeping the constant inline forces this file to be the
// only place with knowledge of the sentinel.
const EICAR_SIGNATURE =
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

@Injectable()
export class LocalScanProvider implements AvScanner {
  readonly name = 'local-dev';
  private readonly logger = new Logger(LocalScanProvider.name);

  async scan(req: ScanRequest): Promise<ScanVerdict> {
    // Quick smoke check to prove the plumbing works without a running
    // ClamAV instance.
    const head = req.bytes.subarray(0, Math.min(1024, req.bytes.length))
      .toString('utf8');
    if (head.includes(EICAR_SIGNATURE)) {
      this.logger.warn(
        `LocalScanProvider: EICAR test signature detected in ${req.fileName}`,
      );
      return {
        status: 'INFECTED',
        provider: this.name,
        signatureId: 'EICAR-TEST',
        notes: 'EICAR test signature (safe rejection; not real malware)',
      };
    }
    return { status: 'CLEAN', provider: this.name };
  }
}
