import { cn } from '@/lib/utils';

import {
  TONE_DOT,
  TONE_PILL,
  statusLabel,
  type StatusTone,
} from './status-tones';

interface StatusPillProps {
  /** Raw enum value (e.g. "UNDER_REVIEW") — auto-formatted to "Under Review". */
  value:    string;
  /** Tone bucket. */
  tone:     StatusTone;
  /** Optional display override (skip auto-formatting). */
  label?:   string;
  /** Show a leading dot for stronger at-a-glance status reading. */
  withDot?: boolean;
  size?:    'sm' | 'md';
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<StatusPillProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-0.5 text-body-xs',
};

// Canonical status pill. Replaces every per-page `bg-amber-100 text-amber-800`
// stamp. Pair with the per-entity tone maps in `status-tones.ts`.
export function StatusPill({
  value,
  tone,
  label,
  withDot = true,
  size = 'md',
  className,
}: StatusPillProps) {
  const text = label ?? statusLabel(value);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset',
        TONE_PILL[tone],
        SIZE_CLASS[size],
        className,
      )}
    >
      {withDot && <span className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone])} aria-hidden />}
      {text}
    </span>
  );
}
