import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Sign in', template: '%s · TalentFlow' },
};

// Auth layout — no sidebar, no top nav. Renders a clean canvas; the
// login page itself owns the split brand+form composition.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  );
}
