import { cn } from '@/lib/utils';

interface WordmarkProps {
  size?: 'sm' | 'md' | 'lg';
  /** Override the default "TalentFlow" with a tenant display name. */
  label?: string;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<WordmarkProps['size']>, string> = {
  sm: 'text-[15px]',
  md: 'text-base',
  lg: 'text-display-xl',
};

// TalentFlow wordmark. Renders the product name in Inter Display with a
// brand-accent gradient. When a tenant display name is supplied (e.g.
// "Acme Recruiting") it replaces "TalentFlow"; this is how the sidebar
// header presents the active workspace.
export function Wordmark({ size = 'md', label = 'TalentFlow', className }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-display font-semibold tracking-tight text-foreground',
        SIZE_CLASS[size],
        className,
      )}
    >
      {label}
    </span>
  );
}
