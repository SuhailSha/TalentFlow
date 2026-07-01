import type { DataTableDensity } from './types';

interface Props {
  columns: number;
  rows?:   number;
  density: DataTableDensity;
}

const ROW_HEIGHT: Record<DataTableDensity, string> = {
  cozy:        'h-14',
  comfortable: 'h-11',
  compact:     'h-9',
};

/**
 * DataTable loading skeleton — mirrors the row height + column count
 * of the target table so there's no layout thrash when the data
 * arrives.
 */
export function DataTableSkeleton({ columns, rows = 10, density }: Props) {
  return (
    <div role="status" aria-label="Loading table" className="overflow-hidden rounded-md border">
      {/* Header stripe */}
      <div className={`grid gap-3 border-b bg-muted/30 px-3 ${ROW_HEIGHT[density]} items-center`} style={{ gridTemplateColumns: `repeat(${columns}, minmax(80px, 1fr))` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-3 w-24 rounded bg-muted-foreground/20" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className={`grid gap-3 border-b px-3 last:border-b-0 ${ROW_HEIGHT[density]} items-center`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(80px, 1fr))` }}
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-3 rounded bg-muted animate-pulse"
              style={{ width: `${45 + ((r * c) % 40)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
