'use client';

import { createContext, useContext, useEffect, useMemo } from 'react';

// ─── Workspace branding ────────────────────────────────────────────────────
// Phase 0B foundation: every tenant can customize three things at runtime:
//   1. Display name (sidebar header, browser title)
//   2. Logo / monogram initials
//   3. Accent color (single HSL hue → algorithmic 11-step scale)
//
// The accent override mutates `--brand-h/s/l` on the document root; the
// rest of the brand scale in globals.css is derived from those three
// channels, so changing them re-themes the entire app safely without
// touching neutral or semantic palettes.
//
// Surface only — no platform-admin UI. Tenants will eventually set these
// values via Settings → Workspace → Branding (Phase 4+); for now the
// provider accepts the values from auth context.

export interface WorkspaceBranding {
  /** Tenant display name (e.g. "Acme Recruiting"). Defaults to "TalentFlow". */
  displayName: string;
  /** Two-letter monogram. Defaults to first two letters of displayName. */
  initials:    string;
  /** Logo URL (optional). When absent, the Monogram component is used. */
  logoUrl?:    string | null;
  /**
   * Brand accent HSL components. Optional — when omitted, the default
   * TalentFlow indigo-violet token in globals.css applies.
   *
   * h: 0–360 (hue), s: 0–100 (saturation %), l: 0–100 (lightness %).
   * Lightness should sit between 50–70 for AA contrast on white text.
   */
  accent?: { h: number; s: number; l: number };
}

const DEFAULT_BRANDING: WorkspaceBranding = {
  displayName: 'TalentFlow',
  initials:    'TF',
};

const WorkspaceBrandingContext = createContext<WorkspaceBranding>(DEFAULT_BRANDING);

interface ProviderProps {
  /** Initial branding (typically from auth context). May be undefined during boot. */
  branding?: Partial<WorkspaceBranding>;
  children:   React.ReactNode;
}

export function WorkspaceBrandingProvider({ branding, children }: ProviderProps) {
  const value = useMemo<WorkspaceBranding>(() => {
    const name = branding?.displayName?.trim() || DEFAULT_BRANDING.displayName;
    const initials = (branding?.initials?.trim() || deriveInitials(name)).slice(0, 2).toUpperCase();
    return {
      displayName: name,
      initials,
      logoUrl: branding?.logoUrl ?? null,
      accent: branding?.accent,
    };
  }, [branding]);

  // Push accent override into CSS variables. Safe-fences the hue/sat/lightness
  // to AA-friendly ranges so a misconfigured tenant cannot break contrast.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (value.accent) {
      const { h, s, l } = value.accent;
      const safeH = Math.max(0,   Math.min(360, Math.round(h)));
      const safeS = Math.max(40,  Math.min(95,  Math.round(s)));
      const safeL = Math.max(45,  Math.min(72,  Math.round(l)));
      root.style.setProperty('--brand-h', String(safeH));
      root.style.setProperty('--brand-s', `${safeS}%`);
      root.style.setProperty('--brand-l', `${safeL}%`);
    } else {
      // Reset to defaults (so switching workspaces clears the override)
      root.style.removeProperty('--brand-h');
      root.style.removeProperty('--brand-s');
      root.style.removeProperty('--brand-l');
    }
    return () => {
      root.style.removeProperty('--brand-h');
      root.style.removeProperty('--brand-s');
      root.style.removeProperty('--brand-l');
    };
  }, [value.accent]);

  return (
    <WorkspaceBrandingContext.Provider value={value}>
      {children}
    </WorkspaceBrandingContext.Provider>
  );
}

export function useWorkspaceBranding(): WorkspaceBranding {
  return useContext(WorkspaceBrandingContext);
}

function deriveInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'TF';
  if (words.length === 1) return words[0]!.slice(0, 2);
  return `${words[0]![0]!}${words[1]![0]!}`;
}
