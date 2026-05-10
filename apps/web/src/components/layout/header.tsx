'use client';

import { Bell, Loader2, LogOut, Menu, Search, Settings, User } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

interface HeaderProps {
  onMenuToggle?: () => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, logout, isLoggingOut } = useAuth();

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:px-6">
      {/* Mobile sidebar toggle */}
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </Button>

      {/* Search bar */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates, jobs…"
            className="pl-8 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Notifications — wired in Step 6+ */}
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>

        {/* Settings */}
        <Button variant="ghost" size="icon" aria-label="Settings">
          <Settings className="h-5 w-5" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {user?.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.firstName} />}
                <AvatarFallback>
                  {user ? getInitials(user.firstName, user.lastName) : <User className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user ? (
                  <>
                    <p className="text-sm font-medium leading-none">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    <p className="text-xs leading-none text-muted-foreground/70">
                      {user.organizationName}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Loading…</p>
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
