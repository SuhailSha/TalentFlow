'use client';

import { Loader2, LogOut, Menu, Search, Settings, User } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { NotificationBell } from './notification-bell';
import { ThemeToggle } from './theme-toggle';

interface HeaderProps {
  onMenuToggle?:  () => void;
  onOpenPalette?: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function Header({ onMenuToggle, onOpenPalette }: HeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
      {/* Mobile sidebar toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Command-bar trigger — visually weighted as the primary entry point */}
      <div className="flex-1 max-w-xl">
        <button
          type="button"
          onClick={onOpenPalette}
          className="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-body-sm text-muted-foreground transition-colors hover:bg-muted/70 focus-visible:bg-muted/70"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">Search or jump to…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground sm:inline-block">
            ⌘ K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />

        {/* User menu — settings link moved out of the dedicated icon button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0" aria-label="Account menu">
              <Avatar className="h-9 w-9">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.firstName} />}
                <AvatarFallback className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-200">
                  {user ? getInitials(user.firstName, user.lastName) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-0.5">
                {user ? (
                  <>
                    <p className="text-body-md font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-body-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="pt-1 text-body-xs leading-none text-muted-foreground/70">
                      {user.organizationName}
                    </p>
                  </>
                ) : (
                  <p className="text-body-xs text-muted-foreground">Loading…</p>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => logout()}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
