import { Edit } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Crumb {
  title: string;
  href?: string;
}

interface WorkspaceHeaderProps {
  /** Eyebrow line above the title, e.g. "Candidate", "Submission". */
  eyebrow?: string;
  title: React.ReactNode;
  /** Optional second line, e.g. job title + company. */
  subtitle?: React.ReactNode;
  breadcrumbs?: Crumb[];
  /** Slot for status badge, urgency indicator, etc. */
  badges?: React.ReactNode;
  /** Slot for primary CTAs (e.g. Edit, Schedule, Delete). */
  actions?: React.ReactNode;
  /** Slot for a row of key facts (e.g. Location, Salary, Availability). */
  facts?: React.ReactNode;
  /** Avatar props for workspace entities like candidates */
  avatar?: { src?: string; alt?: string; fallback: string; status?: 'online' | 'offline' | 'away' };
  className?: string;
}

export function WorkspaceHeader({
  eyebrow,
  title,
  subtitle,
  badges,
  actions,
  facts,
  avatar,
  className,
}: WorkspaceHeaderProps) {
  return (
    <header className={cn('bg-background border-b sticky top-12 z-[5]', className)}>
      {/* Workspace header */}
      <div className="bg-background border-b px-8 py-5 sticky top-12 z-[5]">
        <div className="flex items-center gap-4">
          {avatar && (
            <div className="relative">
              <Avatar className="h-16 w-16 text-lg font-semibold">
                <AvatarImage src={avatar.src} alt={avatar.alt} />
                <AvatarFallback className="text-lg font-semibold bg-blue-100 text-blue-700">
                  {avatar.fallback}
                </AvatarFallback>
              </Avatar>
              {avatar.status && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white bg-green-500"
                  style={{ background: 'hsl(var(--success-500))' }}
                />
              )}
            </div>
          )}

          <div className="flex-1">
            {eyebrow && (
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                {eyebrow}
              </div>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-[26px] font-bold leading-[1.1] tracking-[-0.015em]">{title}</h1>
              {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            </div>
            {subtitle && (
              <div className="mt-1 text-[13.5px] text-muted-foreground group inline-flex items-center gap-1">
                <span className="inline-flex items-center gap-1 hover:bg-muted/70 px-1 py-0.5 -mx-1 rounded cursor-pointer transition-colors">
                  {subtitle}
                  <Edit className="h-[11px] w-[11px] opacity-0 group-hover:opacity-50 transition-opacity" />
                </span>
              </div>
            )}
          </div>

          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {facts && (
          <div className="flex items-center gap-6 mt-[14px] text-[12.5px] text-muted-foreground flex-wrap">
            {facts}
          </div>
        )}
      </div>
    </header>
  );
}

interface FactProps {
  icon?: React.ReactNode;
  label?: string;
  children: React.ReactNode;
  editable?: boolean;
}

export function WorkspaceFact({ icon, label, children, editable }: FactProps) {
  return (
    <div className="inline-flex items-center gap-1.5">
      {icon && <div className="text-muted-foreground w-[13px] h-[13px]">{icon}</div>}
      {label && <span className="text-muted-foreground">{label}</span>}
      {editable ? (
        <span className="inline-flex items-center gap-1 hover:bg-muted/70 px-1 py-0.5 -mx-1 rounded cursor-pointer transition-colors group">
          <span className="text-foreground font-medium">{children}</span>
          <Edit className="h-[11px] w-[11px] opacity-0 group-hover:opacity-50 transition-opacity" />
        </span>
      ) : (
        <span className="text-foreground font-medium">{children}</span>
      )}
    </div>
  );
}
