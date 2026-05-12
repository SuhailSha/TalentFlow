export interface BulkItemResult<T = unknown> {
  id:    string;
  ok:    boolean;
  data?: T;
  error?: string;
}

export interface BulkOperationResult<T = unknown> {
  totalRequested: number;
  succeeded:      number;
  failed:         number;
  results:        BulkItemResult<T>[];
}
