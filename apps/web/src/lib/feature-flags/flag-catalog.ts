// Mirror of apps/api/src/feature-flags/flag-catalog.ts. The two must stay
// in sync; a CI check (Phase 7) compares both files.
//
// Importing this from anywhere in the web app provides typed flag keys.

export const FLAG_KEYS = {
  AI_FEATURES_ENABLED: 'ai_features_enabled',
  DATA_TABLE_V2:       'data_table_v2',
  REPORTS_MODULE:      'reports_module',
} as const;

export type FlagKey = (typeof FLAG_KEYS)[keyof typeof FLAG_KEYS];

export const FLAG_DEFAULTS: Record<FlagKey, boolean> = {
  [FLAG_KEYS.AI_FEATURES_ENABLED]: false,
  [FLAG_KEYS.DATA_TABLE_V2]:       false,
  [FLAG_KEYS.REPORTS_MODULE]:      false,
};
