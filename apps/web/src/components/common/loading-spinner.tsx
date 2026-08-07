import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'subtle';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-[2.5px]',
  xl: 'h-12 w-12 border-[3px]',
};

const variantMap = {
  default: 'border-slate-200 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300',
  primary: 'border-slate-200 border-t-brand-500 dark:border-slate-700 dark:border-t-brand-400',
  subtle: 'border-slate-100 border-t-slate-400 dark:border-slate-800 dark:border-t-slate-500',
};

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('flex items-center justify-center', className)}
    >
      <div
        className={cn(
          'animate-spin rounded-full transition-colors',
          sizeMap[size],
          variantMap[variant],
        )}
        style={{
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <span className="sr-only">{label ?? 'Loading…'}</span>
    </div>
  );
}

/** Enhanced full-page loading state with professional appearance */
export function PageLoader({
  message = 'Loading...',
  showBrand = false,
}: {
  message?: string;
  showBrand?: boolean;
}) {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center gap-6 px-4">
      {showBrand && (
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">TF</span>
          </div>
          <h2 className="font-display font-semibold text-lg text-foreground">TalentFlow</h2>
        </div>
      )}

      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" variant="primary" />
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-foreground">{message}</p>
          <p className="text-xs text-muted-foreground">
            Please wait while we prepare your workspace
          </p>
        </div>
      </div>
    </div>
  );
}
