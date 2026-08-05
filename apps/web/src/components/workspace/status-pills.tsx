import { cn } from '@/lib/utils';

interface StatusPillProps {
  variant: 'info' | 'success' | 'warning' | 'danger' | 'brand';
  children: React.ReactNode;
  className?: string;
}

export function StatusPill({ variant, children, className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        variant === 'info' && 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-200',
        variant === 'success' &&
          'bg-green-50 text-green-700 dark:bg-green-500/20 dark:text-green-200',
        variant === 'warning' &&
          'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200',
        variant === 'danger' && 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-200',
        variant === 'brand' &&
          'bg-blue-50 text-blue-700 font-semibold dark:bg-blue-500/20 dark:text-blue-200',
        className,
      )}
    >
      {children}
    </span>
  );
}

interface StatusDotProps {
  variant: 'info' | 'success' | 'warning' | 'danger';
}

export function StatusDot({ variant }: StatusDotProps) {
  return (
    <span
      className={cn(
        'inline-block w-1.5 h-1.5 rounded-full',
        variant === 'info' && 'bg-blue-500',
        variant === 'success' && 'bg-green-500',
        variant === 'warning' && 'bg-amber-500',
        variant === 'danger' && 'bg-red-500',
      )}
    />
  );
}
