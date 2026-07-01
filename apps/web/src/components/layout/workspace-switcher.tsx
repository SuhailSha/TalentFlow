'use client';

import { ChevronsUpDown, Check } from 'lucide-react';

import { Monogram } from '@/components/brand';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthContext } from '@/providers/auth-provider';
import { cn } from '@/lib/utils';

interface WorkspaceSwitcherProps {
  /** When true, renders monogram-only (56 px sidebar mode). */
  collapsed?: boolean;
}

/**
 * Workspace Switcher (TF-1-10).
 *
 * Clickable header row showing the active workspace. The dropdown lists
 * every workspace the user is a member of.
 *
 * Backend `/me/workspaces` is a Phase 7 ticket; today the dropdown
 * surfaces the current workspace only. When the endpoint lands, populate
 * the list and the switch flow works without further UI change.
 */
export function WorkspaceSwitcher({ collapsed = false }: WorkspaceSwitcherProps) {
  const { user } = useAuthContext();

  const workspaceName = user?.organizationName ?? 'TalentFlow';
  const role          = firstRoleLabel(user?.roles);
  const initials      = deriveInitials(workspaceName);

  const trigger = collapsed ? (
    <button
      type="button"
      aria-label={`Workspace: ${workspaceName}. Click to switch.`}
      className="mx-auto flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted/60"
    >
      <Monogram initials={initials} size={28} />
    </button>
  ) : (
    <button
      type="button"
      aria-label={`Workspace: ${workspaceName}. Click to switch.`}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors',
        'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <Monogram initials={initials} size={28} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-semibold leading-tight">
          {workspaceName}
        </span>
        <span className="block truncate text-[11px] leading-tight text-muted-foreground">
          {role}
        </span>
      </span>
      <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={collapsed ? 'right' : 'bottom'}
        sideOffset={8}
        className="w-72"
      >
        <DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Switch workspace
        </DropdownMenuLabel>

        {/* Current workspace — only entry until /me/workspaces lands */}
        <DropdownMenuItem className="gap-2.5 py-2">
          <Monogram initials={initials} size={28} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium leading-tight">
              {workspaceName}
            </span>
            <span className="block truncate text-[11px] leading-tight text-muted-foreground">
              {role}
              {user?.email ? ` · ${user.email}` : ''}
            </span>
          </span>
          <Check className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Reserved actions — wired in Phase 7 */}
        <DropdownMenuItem disabled className="opacity-70">
          <span className="grid h-6 w-6 place-items-center rounded-md border text-xs">+</span>
          <span className="flex-1">Create workspace</span>
          <span className="text-[10px] uppercase tracking-wider">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-70">
          <span className="grid h-6 w-6 place-items-center rounded-md border text-xs">⚙</span>
          <span className="flex-1">Manage memberships</span>
          <span className="text-[10px] uppercase tracking-wider">Soon</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function firstRoleLabel(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return 'Member';
  const first = roles[0]!;
  return first
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  if (parts.length === 0) return 'TF';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
}
