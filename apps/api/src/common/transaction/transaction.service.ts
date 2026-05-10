import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';

import { PrismaService } from '../../database';

export interface TransactionOptions {
  /** Max wall-clock time for the transaction. Default: 15 000 ms. */
  timeout?: number;
  /** Max time to wait for a DB lock. Default: 5 000 ms. */
  maxWait?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Run `fn` inside a Prisma interactive transaction with sensible defaults.
   * Any exception thrown by `fn` causes an automatic rollback.
   */
  run<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: TransactionOptions,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      timeout:        options?.timeout        ?? 15_000,
      maxWait:        options?.maxWait        ?? 5_000,
      isolationLevel: options?.isolationLevel ?? 'ReadCommitted',
    });
  }
}
