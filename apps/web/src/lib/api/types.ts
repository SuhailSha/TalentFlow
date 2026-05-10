/** Mirrors the server-side ApiResponse<T> shape from apps/api. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  requestId: string;
  timestamp: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}

/** Query params for paginated list endpoints. */
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
