import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export function LoadingSpinner({ size = 'md', className, label }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('flex items-center justify-center', className)}
    >
      <div
        className={cn(
          'animate-spin rounded-full border-muted border-t-primary',
          sizeMap[size],
        )}
      />
      <span className="sr-only">{label ?? 'Loading…'}</span>
    </div>
  );
}

/** Full-page loading state, centered vertically and horizontally. */
export function PageLoader() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
