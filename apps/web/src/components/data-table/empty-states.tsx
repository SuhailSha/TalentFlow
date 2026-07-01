import { AlertTriangle, Inbox as InboxIcon, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';

/**
 * Three empty-state variants — the DataTable renders exactly one at a
 * time based on data, filters, and error. Consumers can override any
 * of them via `emptyStates` in the config.
 */

export function DataTableZeroState({
  title    = "Nothing here yet.",
  subtitle = "When new items arrive they'll show up here.",
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <InboxIcon className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-h2 font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function DataTableNoResults({
  onClear,
  title    = 'No results match these filters',
  subtitle = 'Try removing a filter or two to widen the search.',
}: {
  onClear?: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <Search className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-h2 font-semibold">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>
      {onClear && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}

export function DataTableErrorState({
  onRetry,
  title    = 'Something went wrong loading this list',
  subtitle,
}: {
  onRetry?: () => void;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-full bg-danger-50 text-danger-700">
        <AlertTriangle className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-h2 font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{subtitle}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-6" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
