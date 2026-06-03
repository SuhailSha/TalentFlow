import { cn } from '@/lib/utils';

interface MonogramProps {
  /** Size in pixels — 16/20/24/28/32/40/56. */
  size?: number;
  /** Override the default "TF" mark with tenant initials (max 2 chars). */
  initials?: string;
  /** Optional tint override — defaults to brand gradient. */
  tone?: 'brand' | 'neutral';
  className?: string;
  title?: string;
}

// TalentFlow monogram. Default = brand gradient with "TF" mark.
// Multi-tenant: when a tenant supplies initials (e.g. "AR" for Acme Recruiting)
// they override the mark; the gradient still follows the active brand
// CSS variables, so tenant accent color flows through automatically.
export function Monogram({
  size = 28,
  initials = 'TF',
  tone = 'brand',
  className,
  title,
}: MonogramProps) {
  const safeInitials = initials.slice(0, 2).toUpperCase();

  return (
    <span
      role="img"
      aria-label={title ?? 'TalentFlow'}
      style={{ width: size, height: size }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-display font-bold leading-none tracking-tight',
        tone === 'brand'
          ? 'bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xs'
          : 'bg-neutral-900 text-neutral-50 dark:bg-neutral-50 dark:text-neutral-900',
        className,
      )}
    >
      <span style={{ fontSize: Math.round(size * 0.45) }}>{safeInitials}</span>
    </span>
  );
}
