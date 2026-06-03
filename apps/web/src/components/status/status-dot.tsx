import { cn } from '@/lib/utils';

import { TONE_DOT, type StatusTone } from './status-tones';

interface StatusDotProps {
  tone:     StatusTone;
  size?:    'xs' | 'sm' | 'md';
  /** Pulsing animation — used when state is "live" (e.g. parsing in progress). */
  pulse?:   boolean;
  className?: string;
  /** Always provide a label for screen readers. */
  label:    string;
}

const SIZE_CLASS: Record<NonNullable<StatusDotProps['size']>, string> = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
};

// Inline dot for compact tables / sidebar nav. The pulse variant signals
// live state (e.g. running, scheduled-today). Always pair with a visible
// or aria label — the dot is decorative on its own.
export function StatusDot({ tone, size = 'sm', pulse, className, label }: StatusDotProps) {
  return (
    <span
      role="img"
      aria-label={label}
      className={cn('relative inline-flex shrink-0', SIZE_CLASS[size], className)}
    >
      {pulse && (
        <span
          aria-hidden
          className={cn(
            'absolute inset-0 animate-ping rounded-full opacity-70',
            TONE_DOT[tone],
          )}
        />
      )}
      <span className={cn('relative inline-block rounded-full', SIZE_CLASS[size], TONE_DOT[tone])} />
    </span>
  );
}
