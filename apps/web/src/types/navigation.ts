import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/** Flat breadcrumb entry used by page headers. */
export interface BreadcrumbItem {
  title: string;
  href?: string;
}
