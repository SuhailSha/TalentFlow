export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  requestId: string;
  timestamp: string;
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  requestId: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}
