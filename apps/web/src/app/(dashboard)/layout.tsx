'use client';

import { useState } from 'react';

import { CommandPalette, useCommandPalette } from '@/components/layout/command-palette';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { useSidebarState } from '@/hooks/use-sidebar-state';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [, setSidebarOpen] = useState(false);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { collapsed, toggle: toggleSidebar } = useSidebarState();

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Skip-to-content link — visible only on keyboard focus. WCAG 2.4.1. */}
      <a href="#main-content" className="skip-to-content text-body-sm font-medium">
        Skip to main content
      </a>

      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleSidebar} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          onOpenPalette={() => setPaletteOpen(true)}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto focus:outline-none"
        >
          <div className="container mx-auto max-w-7xl p-6">{children}</div>
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}
