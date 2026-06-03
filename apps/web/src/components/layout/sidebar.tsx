'use client';

import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  FileUp,
  GitMerge,
  LayoutDashboard,
  Settings,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { LogoLockup } from '@/components/brand';
import { useDuplicateStats, useReviewStats } from '@/hooks';
import { cn } from '@/lib/utils';
import { useWorkspaceBranding } from '@/providers/workspace-branding-provider';
import type { NavGroup } from '@/types';

/**
 * Static nav config — Step 5 will add permission-based filtering.
 * Each item's `href` becomes active when the pathname starts with it.
 */
const navGroups: NavGroup[] = [
  {
    items: [
      { title: 'Dashboard',     href: '/dashboard',      icon: LayoutDashboard },
      { title: 'Action Center', href: '/action-center',  icon: Zap },
    ],
  },
  {
    title: 'Recruitment',
    items: [
      { title: 'Candidates', href: '/candidates', icon: Users },
      { title: 'Jobs', href: '/jobs', icon: FileText },
      { title: 'Submissions', href: '/submissions', icon: Briefcase },
      { title: 'Interviews', href: '/interviews', icon: CalendarClock },
      { title: 'Reminders',  href: '/reminders',  icon: Bell },
      { title: 'Resumes',    href: '/resumes',    icon: FileUp },
      { title: 'Resume reviews', href: '/resume-reviews', icon: ClipboardList },
      { title: 'Duplicate reviews', href: '/duplicate-reviews', icon: GitMerge },
    ],
  },
  {
    title: 'Vendors',
    items: [
      { title: 'Vendors', href: '/vendors', icon: Building2 },
    ],
  },
  {
    title: 'Reports',
    items: [
      { title: 'Analytics', href: '/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Settings',
    items: [
      { title: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  // Pending-review count for the Resume reviews badge.
  const { data: reviewStats }    = useReviewStats();
  const { data: duplicateStats } = useDuplicateStats();
  const pendingReviews    = reviewStats?.pending    ?? 0;
  const pendingDuplicates = duplicateStats?.pending ?? 0;
  const branding          = useWorkspaceBranding();

  return (
    <aside
      className={cn(
        'hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar',
        className,
      )}
    >
      {/* Workspace switcher header (Phase 0B foundation; full popover in Phase 1) */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Link
          href="/dashboard"
          className="flex w-full items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-sidebar-accent/60 focus-visible:bg-sidebar-accent/60"
          aria-label={`${branding.displayName} workspace`}
        >
          <LogoLockup
            size="sm"
            label={branding.displayName}
            initials={branding.initials}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx} className={cn(groupIdx > 0 && 'mt-4')}>
            {group.title && (
              <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                {group.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                // Dynamic badges: pending counts on review surfaces.
                const liveBadge =
                  item.href === '/resume-reviews'    && pendingReviews    > 0 ? pendingReviews
                : item.href === '/duplicate-reviews' && pendingDuplicates > 0 ? pendingDuplicates
                : item.badge;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-md px-3 py-2 text-body-md font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
                        item.disabled && 'pointer-events-none opacity-50',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-brand-500"
                        />
                      )}
                      {Icon && (
                        <Icon className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-brand-600 dark:text-brand-300' : 'text-muted-foreground group-hover:text-foreground',
                        )} />
                      )}
                      {item.title}
                      {liveBadge != null && (
                        <span className="ml-auto rounded-full bg-brand-500 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                          {liveBadge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer — sidebar collapse + theme toggle land in Phase 1 */}
      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 text-body-xs text-muted-foreground">TalentFlow · v0.2</p>
      </div>
    </aside>
  );
}
