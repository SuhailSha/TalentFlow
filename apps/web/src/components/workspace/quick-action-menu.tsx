'use client';

import Link from 'next/link';
import { MoreHorizontal, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface QuickAction {
  id:        string;
  label:     string;
  icon?:     LucideIcon;
  href?:     string;
  onClick?:  () => void;
  /** Visually flags destructive/dangerous actions. */
  danger?:   boolean;
  /** Insert a separator BEFORE this item. */
  separator?: boolean;
  disabled?: boolean;
}

interface QuickActionMenuProps {
  actions:  QuickAction[];
  label?:   string;
  /** Optional custom trigger; defaults to a ghost button with three-dot icon. */
  trigger?: React.ReactNode;
  align?:   'start' | 'center' | 'end';
}

export function QuickActionMenu({ actions, label, trigger, align = 'end' }: QuickActionMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8 px-2">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open actions menu</span>
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}
        {actions.map((action) => {
          const Icon = action.icon;
          const item = (
            <DropdownMenuItem
              key={action.id}
              disabled={action.disabled}
              onClick={action.onClick}
              className={cn(action.danger && 'text-red-600 focus:text-red-600 focus:bg-red-50')}
              asChild={!!action.href}
            >
              {action.href ? (
                <Link href={action.href} className="flex w-full items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label}
                </Link>
              ) : (
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {action.label}
                </div>
              )}
            </DropdownMenuItem>
          );
          if (action.separator) {
            return (
              <span key={`${action.id}-wrap`}>
                <DropdownMenuSeparator />
                {item}
              </span>
            );
          }
          return item;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
