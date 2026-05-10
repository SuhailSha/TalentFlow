import type { ApiResponse, PaginatedResponse } from '../types';

/** Wraps data in the standard success envelope. */
export function ok<T>(data: T, requestId: string): ApiResponse<T> {
  return {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
}

/** Wraps a page of data with full pagination meta. */
export function paginated<T>(
  data: T[],
  meta: PaginationMeta,
  requestId: string,
): PaginatedResponse<T> {
  const totalPages = meta.limit > 0 ? Math.ceil(meta.total / meta.limit) : 0;
  return {
    success: true,
    data,
    meta: {
      total: meta.total,
      page: meta.page,
      limit: meta.limit,
      totalPages,
      hasNextPage: meta.page < totalPages,
      hasPreviousPage: meta.page > 1,
    },
    requestId,
    timestamp: new Date().toISOString(),
  };
}

/** Compute the Prisma `skip` value from 1-based page + limit. */
export function toSkip(page: number, limit: number): number {
  return (page - 1) * limit;
}
