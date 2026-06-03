import { cn } from '@/lib/utils';

import { Monogram } from './monogram';
import { Wordmark } from './wordmark';

interface LogoLockupProps {
  size?: 'sm' | 'md' | 'lg';
  /** Workspace display name (e.g. "Acme Recruiting"). Defaults to "TalentFlow". */
  label?: string;
  /** Tenant initials for the monogram (max 2 chars). */
  initials?: string;
  /** Secondary line under the wordmark (e.g. role, plan). */
  subline?: string;
  className?: string;
}

const MONO_SIZE: Record<NonNullable<LogoLockupProps['size']>, number> = {
  sm: 24,
  md: 28,
  lg: 36,
};

const WORD_SIZE: Record<NonNullable<LogoLockupProps['size']>, 'sm' | 'md' | 'lg'> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

// Monogram + Wordmark composed for sidebar header, login, and email
// signatures. The lockup is the canonical brand presentation; never
// render the monogram and wordmark side-by-side without going through
// this component.
export function LogoLockup({
  size = 'md',
  label,
  initials,
  subline,
  className,
}: LogoLockupProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Monogram size={MONO_SIZE[size]} initials={initials} />
      <span className="flex flex-col leading-tight">
        <Wordmark size={WORD_SIZE[size]} label={label} />
        {subline && (
          <span className="text-body-xs text-muted-foreground">{subline}</span>
        )}
      </span>
    </span>
  );
}
