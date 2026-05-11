'use client';

import { Building2, CreditCard, Shield, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

const settingsNav = [
  { title: 'Organization Profile', href: '/settings/organization', icon: Building2 },
  { title: 'Team Members',         href: '/settings/team',         icon: Users },
  { title: 'Roles & Permissions',  href: '/settings/roles',        icon: Shield },
  { title: 'Subscription & Billing', href: '/settings/subscription', icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your organization and workspace preferences</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Settings sidebar nav */}
        <aside className="w-full shrink-0 lg:w-52">
          <nav className="flex flex-row gap-1 lg:flex-col">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Page content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
