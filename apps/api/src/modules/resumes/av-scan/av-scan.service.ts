import { Inject, Injectable, Logger } from '@nestjs/common';
import { ResumeScanStatus } from '@repo/database';

import { PrismaService } from '../../../database';

import type { AvScanner, ScanRequest, ScanVerdict } from './av-scanner.interface';

export const AV_SCANNER = Symbol('AV_SCANNER');

/**
 * AvScanService — TF-1-16 orchestration layer.
 *
 * Called by the resume upload pipeline after the file is persisted to
 * storage. Marks the version SCANNING → invokes the scanner → writes
 * the resulting verdict (CLEAN / INFECTED / SCAN_TIMEOUT / SCAN_ERROR)
 * back to `resume_versions.scan_status`.
 *
 * Downloads are gated in `ResumesService.download` on `scan_status =
 * CLEAN`. This service does not touch storage — quarantine handling
 * (keeping INFECTED files in a separate bucket) is a follow-up
 * infrastructure concern; today, INFECTED just blocks the download.
 *
 * Retry policy:
 *   - `SCAN_ERROR` verdicts stay marked as such. A separate cron
 *     (Phase 6) sweeps and reissues the scan up to 3 times before
 *     escalating to an admin.
 *   - `SCAN_TIMEOUT` requires manual review — the file might have been
 *     too large or the scanner too slow; either way, silence is unsafe.
 */
@Injectable()
export class AvScanService {
  private readonly logger = new Logger(AvScanService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(AV_SCANNER) private readonly scanner: AvScanner,
  ) {}

  /**
   * Scan a resume version. Idempotent — safe to call twice, but the
   * caller should first check that the version is still PENDING.
   */
  async scanVersion(
    versionId: string,
    req: ScanRequest,
  ): Promise<ScanVerdict> {
    // Move to SCANNING so a concurrent trigger sees the work is claimed.
    // updateMany + count check avoids a race where two scanners could
    // both process the same version.
    const claim = await this.prisma.resumeVersion.updateMany({
      where: { id: versionId, scanStatus: ResumeScanStatus.PENDING },
      data:  { scanStatus: ResumeScanStatus.SCANNING },
    });
    if (claim.count === 0) {
      // Another worker already claimed / a previous scan is done.
      // Return the current status without re-scanning.
      const current = await this.prisma.resumeVersion.findUnique({
        where: { id: versionId },
        select: { scanStatus: true, scanProvider: true, scanSignatureId: true, scanNotes: true },
      });
      if (!current) throw new Error(`ResumeVersion ${versionId} not found`);
      // Reconstruct a verdict from the DB state. Callers usually don't
      // care about the return here; the DB is the source of truth.
      switch (current.scanStatus) {
        case ResumeScanStatus.CLEAN:
          return { status: 'CLEAN', provider: current.scanProvider ?? 'unknown' };
        case ResumeScanStatus.INFECTED:
          return {
            status: 'INFECTED',
            provider: current.scanProvider ?? 'unknown',
            signatureId: current.scanSignatureId ?? 'unknown',
            ...(current.scanNotes ? { notes: current.scanNotes } : {}),
          };
        case ResumeScanStatus.SCAN_TIMEOUT:
          return {
            status: 'SCAN_TIMEOUT',
            provider: current.scanProvider ?? 'unknown',
            ...(current.scanNotes ? { notes: current.scanNotes } : {}),
          };
        case ResumeScanStatus.SCAN_ERROR:
          return {
            status: 'SCAN_ERROR',
            provider: current.scanProvider ?? 'unknown',
            notes: current.scanNotes ?? 'unknown',
          };
        default:
          // Still SCANNING — the other worker will write the verdict.
          // Return a soft "not ready" via SCAN_ERROR so the caller can
          // decide.
          return { status: 'SCAN_ERROR', provider: 'in-flight', notes: 'Scan in progress' };
      }
    }

    // Run the scanner. Errors here map to SCAN_ERROR — the file exists
    // but we couldn't determine its status. Retry is a Phase 6 concern.
    let verdict: ScanVerdict;
    try {
      verdict = await this.scanner.scan(req);
    } catch (err) {
      verdict = {
        status: 'SCAN_ERROR',
        provider: this.scanner.name,
        notes: err instanceof Error ? err.message.slice(0, 500) : String(err).slice(0, 500),
      };
    }

    // Persist the verdict.
    await this.prisma.resumeVersion.update({
      where: { id: versionId },
      data: {
        scanStatus:      mapVerdict(verdict),
        scanCompletedAt: new Date(),
        scanProvider:    verdict.provider,
        scanSignatureId: verdict.status === 'INFECTED' ? verdict.signatureId : null,
        scanNotes:       'notes' in verdict ? verdict.notes ?? null : null,
      },
    });

    if (verdict.status !== 'CLEAN') {
      this.logger.warn(
        `AV verdict for ${versionId}: ${verdict.status} (${verdict.provider})`,
      );
    }

    return verdict;
  }

  /**
   * Enforce the download gate. Callers use this before serving bytes.
   * Throws when the version has not been cleared.
   */
  async assertServable(versionId: string): Promise<void> {
    const v = await this.prisma.resumeVersion.findUnique({
      where: { id: versionId },
      select: { scanStatus: true },
    });
    if (!v) throw new Error(`ResumeVersion ${versionId} not found`);
    if (v.scanStatus !== ResumeScanStatus.CLEAN) {
      throw new Error(
        `ResumeVersion ${versionId} cannot be served (scanStatus=${v.scanStatus})`,
      );
    }
  }
}

function mapVerdict(v: ScanVerdict): ResumeScanStatus {
  switch (v.status) {
    case 'CLEAN':        return ResumeScanStatus.CLEAN;
    case 'INFECTED':     return ResumeScanStatus.INFECTED;
    case 'SCAN_TIMEOUT': return ResumeScanStatus.SCAN_TIMEOUT;
    case 'SCAN_ERROR':   return ResumeScanStatus.SCAN_ERROR;
  }
}
