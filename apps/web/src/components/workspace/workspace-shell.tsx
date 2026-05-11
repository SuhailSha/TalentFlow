import { cn } from '@/lib/utils';

interface WorkspaceShellProps {
  children: React.ReactNode;
  rail?:    React.ReactNode;
  className?: string;
}

/**
 * Two-column workspace layout. Main column on the left, optional sticky rail on
 * the right. Collapses to single column under lg.
 */
export function WorkspaceShell({ children, rail, className }: WorkspaceShellProps) {
  return (
    <div className={cn('grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]', className)}>
      <main className="min-w-0 space-y-6">{children}</main>
      {rail && (
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          {rail}
        </aside>
      )}
    </div>
  );
}
