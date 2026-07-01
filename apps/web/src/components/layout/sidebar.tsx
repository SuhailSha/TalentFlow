'use client';

import {
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  ChevronFirst,
  ChevronLast,
  ClipboardList,
  FileText,
  GitMerge,
  Home,
  Inbox,
  Keyboard,
  LineChart,
  Moon,
  Settings,
  Send,
  Sun,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import type { ComponentType } from 'react';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useDuplicateStats, useReviewStats } from '@/hooks';
import { useFlag } from '@/providers/feature-flags-provider';
import { FLAG_KEYS } from '@/lib/feature-flags/flag-catalog';
import { cn } from '@/lib/utils';

import { WorkspaceSwitcher } from './workspace-switcher';

// ── Nav config ────────────────────────────────────────────────────────────────
// Grouped per approved Phase 1 mockup (sidebar-expanded.html). Groups are:
//   Top items (Home, Inbox)   — no group label
//   PINNED                     — user-pinned records (Phase 7 backend)
//   RECRUIT                    — daily-workflow entities
//   RESUME INTELLIGENCE        — first-class product area
//   VENDORS
//   REPORTS                    — reserved; gated behind `reports_module` flag
//   WORK                       — settings

interface NavItem {
  title: string;
  href:  string;
  icon:  ComponentType<{ className?: string }>;
  /** Optional dynamic count. Rendered as a badge. */
  badge?: number;
  /** Show a warning-toned badge instead of the default brand tone. */
  badgeTone?: 'brand' | 'warn';
}

interface NavGroup {
  label?: string;
  items:  NavItem[];
}

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  className?: string;
}

export function Sidebar({ collapsed = false, onToggleCollapsed, className }: SidebarProps) {
  const pathname = usePathname();
  const reportsOn = useFlag(FLAG_KEYS.REPORTS_MODULE);

  // Live counts drive dynamic badges. Both are lightweight polled queries.
  const { data: reviewStats }    = useReviewStats();
  const { data: duplicateStats } = useDuplicateStats();
  const pendingReviews    = reviewStats?.pending    ?? 0;
  const pendingDuplicates = duplicateStats?.pending ?? 0;

  const groups: NavGroup[] = [
    {
      items: [
        { title: 'Home',  href: '/dashboard', icon: Home },
        { title: 'Inbox', href: '/inbox',     icon: Inbox },
      ],
    },
    // Pinned section is reserved. Backend `/me/pinned` lands in Phase 7;
    // the group is hidden while empty rather than showing a placeholder —
    // a fresh user should not see a section with no items.
    {
      label: 'Recruit',
      items: [
        { title: 'Candidates',  href: '/candidates',  icon: Users },
        { title: 'Jobs',        href: '/jobs',        icon: Briefcase },
        { title: 'Submissions', href: '/submissions', icon: Send },
        { title: 'Interviews',  href: '/interviews',  icon: CalendarClock },
        { title: 'Reminders',   href: '/reminders',   icon: Bell },
      ],
    },
    {
      label: 'Resume Intelligence',
      items: [
        { title: 'Resumes',       href: '/resumes',           icon: FileText },
        {
          title: 'Review queue',
          href:  '/resume-reviews',
          icon:  ClipboardList,
          ...(pendingReviews    > 0 ? { badge: pendingReviews } : {}),
        },
        {
          title: 'Duplicates',
          href:  '/duplicate-reviews',
          icon:  GitMerge,
          ...(pendingDuplicates > 0 ? { badge: pendingDuplicates, badgeTone: 'warn' as const } : {}),
        },
      ],
    },
    {
      label: 'Vendors',
      items: [{ title: 'Vendors', href: '/vendors', icon: Building2 }],
    },
    ...(reportsOn
      ? [{
          label: 'Reports',
          items: [{ title: 'Analytics', href: '/analytics', icon: LineChart }],
        }]
      : []),
    {
      label: 'Work',
      items: [{ title: 'Settings', href: '/settings', icon: Settings }],
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        aria-label="Primary navigation"
        className={cn(
          // Same-mode-as-canvas surface — not the dark opaque bar.
          'hidden lg:flex flex-col border-r bg-sidebar transition-[width] duration-150',
          collapsed ? 'w-[60px]' : 'w-60',
          className,
        )}
      >
        {/* Workspace switcher */}
        <div
          className={cn(
            'border-b',
            collapsed ? 'flex items-center justify-center py-2' : 'px-2 py-2',
          )}
        >
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {groups.map((group, gi) => (
            <div
              key={gi}
              className={cn(gi > 0 && (collapsed ? 'mt-2 border-t border-border/60 pt-2' : 'mt-4'))}
            >
              {group.label && !collapsed && (
                <div className="px-2.5 pb-1 pt-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground/80">
                  {group.label}
                </div>
              )}
              <ul className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavRow
                    key={item.href}
                    item={item}
                    collapsed={collapsed}
                    active={pathname === item.href || pathname.startsWith(item.href + '/')}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <SidebarFooter collapsed={collapsed} onToggleCollapsed={onToggleCollapsed} />
      </aside>
    </TooltipProvider>
  );
}

// ── NavRow ────────────────────────────────────────────────────────────────────

function NavRow({
  item,
  collapsed,
  active,
}: {
  item:      NavItem;
  collapsed: boolean;
  active:    boolean;
}) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center rounded-md text-[13.5px] font-medium transition-colors',
        collapsed ? 'h-9 justify-center' : 'h-9 gap-2.5 px-2.5',
        // Base tone
        !active && 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        // Active state — expanded: 3px left bar + brand-50 bg + brand-700 text
        active && !collapsed && 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200',
        // Active state — collapsed: filled brand-500 background
        active && collapsed && 'bg-brand-500 text-white',
      )}
    >
      {active && !collapsed && (
        <span
          aria-hidden
          className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-md bg-brand-500 dark:bg-brand-400"
        />
      )}
      <Icon className={cn(
        'shrink-0',
        collapsed ? 'h-[18px] w-[18px]' : 'h-4 w-4',
        !active && 'text-muted-foreground',
      )} />
      {!collapsed && <span className="min-w-0 flex-1 truncate">{item.title}</span>}
      {!collapsed && typeof item.badge === 'number' && item.badge > 0 && (
        <span
          className={cn(
            'ml-auto inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
            item.badgeTone === 'warn'
              ? 'bg-warning-500 text-white'
              : 'bg-brand-500 text-white',
          )}
        >
          {item.badge}
        </span>
      )}
      {/* Collapsed mini-badge — dot in the icon's top-right */}
      {collapsed && typeof item.badge === 'number' && item.badge > 0 && (
        <span
          aria-hidden
          className={cn(
            'absolute top-1 right-1 h-[9px] w-[9px] rounded-full border-2 border-sidebar',
            item.badgeTone === 'warn' ? 'bg-warning-500' : 'bg-brand-500',
          )}
        />
      )}
    </Link>
  );

  if (!collapsed) return <li>{link}</li>;

  // Collapsed mode: wrap with tooltip so hovering an icon reveals the label.
  return (
    <li>
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8} className="text-xs">
          {item.title}
          {typeof item.badge === 'number' && item.badge > 0 && (
            <span className="ml-1.5 opacity-70">({item.badge})</span>
          )}
        </TooltipContent>
      </Tooltip>
    </li>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function SidebarFooter({
  collapsed,
  onToggleCollapsed,
}: {
  collapsed: boolean;
  onToggleCollapsed?: () => void;
}) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && resolvedTheme === 'dark');

  return (
    <div
      className={cn(
        'border-t',
        collapsed ? 'flex flex-col items-center gap-1 py-2' : 'flex items-center gap-1 px-2 py-2',
      )}
    >
      <FooterButton
        collapsed={collapsed}
        icon={collapsed ? <ChevronLast className="h-4 w-4" /> : <ChevronFirst className="h-4 w-4" />}
        label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggleCollapsed}
      />
      <FooterButton
        collapsed={collapsed}
        icon={<Keyboard className="h-4 w-4" />}
        label="Keyboard shortcuts"
      />
      <FooterButton
        collapsed={collapsed}
        icon={isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      />
      {!collapsed && (
        <span className="ml-auto pr-1 text-[11px] text-muted-foreground/60">v0.3</span>
      )}
    </div>
  );
}

function FooterButton({
  collapsed,
  icon,
  label,
  onClick,
}: {
  collapsed: boolean;
  icon:      React.ReactNode;
  label:     string;
  onClick?:  () => void;
}) {
  const btn = (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'grid h-8 w-8 place-items-center rounded-md text-muted-foreground',
        'hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      {icon}
    </button>
  );

  if (!collapsed) return btn;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}
