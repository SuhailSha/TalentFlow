/**
 * Development-only axe-core hook.
 *
 * @axe-core/react patches React DOM in development to run axe scans on
 * every render and print violations to the browser console. It is a
 * no-op in production (the import is dev-only via tree-shaking + the
 * runtime env check below).
 *
 * Wire this from `app/layout.tsx` (client component) via:
 *
 *   if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
 *     void import('@/lib/a11y/axe-dev');
 *   }
 *
 * Violations do NOT throw or fail the build — they surface in the
 * console with severity + WCAG rule reference. Devs fix them before
 * merging.
 *
 * WCAG target: 2.2 AA per ADR-006 / architecture review §accessibility.
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  // Dynamic import so axe never lands in the production bundle.
  void (async () => {
    try {
      const [ReactModule, ReactDOMModule, axeMod] = await Promise.all([
        import('react'),
        import('react-dom'),
        import('@axe-core/react'),
      ]);
      const axe = axeMod.default;
      // 1000ms debounce keeps the console readable during rapid re-renders.
      axe(ReactModule.default, ReactDOMModule.default, 1000, {
        rules: [
          // Warn only on interactions that block keyboard usage —
          // never on landmark rules that fire on partial layouts (e.g.
          // during hot-reload).
          { id: 'region', enabled: false },
        ],
      });
    } catch (err) {
      // Silent — dev tool failure must not affect the app.
      // eslint-disable-next-line no-console
      console.warn('[a11y] axe-core dev runner failed to load:', err);
    }
  })();
}

export {};
