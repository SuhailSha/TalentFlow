import { redirect } from 'next/navigation';

/**
 * Root route — immediately redirects to the dashboard.
 *
 * Step 5 (auth middleware) will intercept unauthenticated requests before
 * they ever reach this handler and redirect to /login instead.
 */
export default function RootPage() {
  redirect('/dashboard');
}
