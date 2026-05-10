'use client';

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  FileText,
  LayoutDashboard,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';
import type { NavGroup } from '@/types';

/**
 * Static nav config — Step 5 will add permission-based filtering.
 * Each item's `href` becomes active when the pathname starts with it.
 */
const navGroups: NavGroup[] = [
  {
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Recruitment',
    items: [
      { title: 'Candidates', href: '/candidates', icon: Users },
      { title: 'Jobs', href: '/jobs', icon: FileText },
      { title: 'Submissions', href: '/submissions', icon: Briefcase },
      { title: 'Interviews', href: '/interviews', icon: CalendarClock },
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
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'hidden lg:flex w-64 flex-col border-r bg-sidebar',
        className,
      )}
    >
      {/* Logo / Brand */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
            <span className="text-xs font-bold text-primary-foreground">RP</span>
          </div>
          <span className="font-semibold text-sidebar-foreground">RecruitPro</span>
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
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        item.disabled && 'pointer-events-none opacity-50',
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {Icon && <Icon className="h-4 w-4 shrink-0" />}
                      {item.title}
                      {item.badge != null && (
                        <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                          {item.badge}
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

      {/* Footer — tenant/org switcher added in Step 5 */}
      <div className="border-t border-sidebar-border p-3">
        <p className="px-3 text-xs text-sidebar-foreground/40">v1.0.0</p>
      </div>
    </aside>
  );
}
