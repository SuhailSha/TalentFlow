/**
 * AV scanner boundary (TF-1-16).
 *
 * Every uploaded resume version passes through this contract. The
 * concrete implementation swaps by config — `LocalScanProvider` in dev
 * (permissive; passes anything except EICAR test files), `ClamAVScanner`
 * in production (via clamd network protocol or Lambda invoke).
 *
 * The scanner NEVER handles storage keys directly. Callers provide the
 * bytes; the scanner returns a verdict. This keeps the boundary
 * cloud-agnostic — a future S3-Lambda scanner is a new adapter, not a
 * new consumer.
 */

export type ScanVerdict =
  | { status: 'CLEAN'; provider: string }
  | { status: 'INFECTED'; provider: string; signatureId: string; notes?: string }
  | { status: 'SCAN_TIMEOUT'; provider: string; notes?: string }
  | { status: 'SCAN_ERROR'; provider: string; notes: string };

export interface ScanRequest {
  /** File contents. Callers stream large files; we accept Buffer to keep
   *  the interface simple. Scanners with size caps enforce them here. */
  bytes:    Buffer;
  fileName: string;
  mimeType: string;
  /** Storage key (informational) — logged for correlation. */
  storageKey?: string;
  /** Signal for cancellation on shutdown / retry. */
  signal?: AbortSignal;
}

export interface AvScanner {
  readonly name: string;
  scan(req: ScanRequest): Promise<ScanVerdict>;
}
