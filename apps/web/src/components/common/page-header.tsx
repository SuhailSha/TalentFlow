import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="space-y-1">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} className="flex items-center gap-1">
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-foreground transition-colors">
                    {crumb.title}
                  </Link>
                ) : (
                  <span className="text-foreground font-medium">{crumb.title}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
