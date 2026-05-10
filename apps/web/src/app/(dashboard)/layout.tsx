'use client';

import { useState } from 'react';

import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';

/**
 * Dashboard layout — Client Component because Header needs to pass a toggle
 * callback to control mobile sidebar open state.
 *
 * Structure:
 *   <aside> Sidebar (hidden on mobile, always visible lg+)
 *   <div>
 *     <Header> (contains mobile menu button)
 *     <main> page content
 *   </div>
 *
 * Step 5 will add an AuthGuard wrapper here that verifies the session and
 * redirects to /login if unauthenticated.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((prev) => !prev)} />
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
