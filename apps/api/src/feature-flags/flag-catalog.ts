/**
 * Catalogue of all feature flags defined in the application.
 *
 * Adding a flag:
 *   1. Add a key to FLAG_KEYS below.
 *   2. Document its purpose, default, and removal target in DEFAULTS.
 *   3. Reference it via the typed `useFlag` hook on the frontend or
 *      `FeatureFlagsService.isEnabled(...)` on the backend.
 *
 * Removing a flag:
 *   - When a release flag is fully rolled out, remove it from this file
 *     and grep for stragglers; the lint step will fail on undefined
 *     keys, surfacing leftover usage.
 *
 * Linting: ESLint custom rule (Phase 7) refuses `useFlag('<literal>')`
 * unless `<literal>` is a member of FLAG_KEYS.
 *
 * Tool boundary: this file is the contract. The implementation switches
 * between a local resolver (today) and GrowthBook (later) without
 * touching this file.
 */

export const FLAG_KEYS = {
  /** Master switch for AI surfaces (Summary, Match, Risk, etc.). Per-tenant override. */
  AI_FEATURES_ENABLED: 'ai_features_enabled',
  /** Switches Candidate list from card-grid to new DataTable. */
  DATA_TABLE_V2: 'data_table_v2',
  /** Reveals the Reports sidebar group + routes. */
  REPORTS_MODULE: 'reports_module',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

/**
 * Default values when no resolver returns a decision. These are
 * intentionally conservative: new capabilities default OFF; rollback
 * switches default ON.
 */
export const FLAG_DEFAULTS: Record<FlagKey, boolean> = {
  [FLAG_KEYS.AI_FEATURES_ENABLED]: false,
  [FLAG_KEYS.DATA_TABLE_V2]:       false,
  [FLAG_KEYS.REPORTS_MODULE]:      false,
};

/** Per-flag metadata for the admin surface (Phase 7) and audit log. */
export const FLAG_META: Record<FlagKey, {
  description: string;
  type: 'release' | 'experiment' | 'kill-switch' | 'permission';
  ownerTeam: 'product' | 'platform' | 'security';
}> = {
  [FLAG_KEYS.AI_FEATURES_ENABLED]: {
    description: 'Master switch for all AI surfaces (Summary, Match, Risk, Suggested Actions). Per-tenant override possible.',
    type: 'release',
    ownerTeam: 'product',
  },
  [FLAG_KEYS.DATA_TABLE_V2]: {
    description: 'Switches Candidate list (and later all lists) to the new DataTable primitive.',
    type: 'release',
    ownerTeam: 'product',
  },
  [FLAG_KEYS.REPORTS_MODULE]: {
    description: 'Reveals the Reports sidebar group + reserved routes once the module ships.',
    type: 'release',
    ownerTeam: 'product',
  },
};
