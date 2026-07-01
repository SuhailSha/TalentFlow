import { Injectable } from '@nestjs/common';

import { FLAG_DEFAULTS, type FlagKey } from './flag-catalog';

/**
 * Feature Flags — TF-1-7 (server-side).
 *
 * MVP resolver is environment-variable backed. The API shape mirrors
 * GrowthBook so swapping to GrowthBook self-hosted is a single-file
 * change in the resolver below.
 *
 * Resolution order (first match wins):
 *   1. Env override `FLAG_<KEY>=true|false` (case-insensitive flag key)
 *      e.g. `FLAG_AI_FEATURES_ENABLED=true`
 *   2. Per-tenant override in the future (Phase 7 admin UI)
 *   3. Catalog default
 *
 * Targeting axes available on `EvalContext`:
 *   - organizationId
 *   - userId
 *   - role
 *   - plan
 *   - cohort: deterministic 0–99 bucket derived from userId
 *
 * The MVP resolver ignores targeting beyond org-level env override.
 * GrowthBook adapter consumes all axes.
 */

export interface EvalContext {
  organizationId?: string;
  userId?:         string;
  role?:           string;
  plan?:           string;
  cohort?:         number;          // 0..99
}

@Injectable()
export class FeatureFlagsService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isEnabled(key: FlagKey, _ctx: EvalContext = {}): boolean {
    // 1. Per-flag environment override (shorthand for ops + ad-hoc rollouts)
    const envKey = `FLAG_${key.toUpperCase()}`;
    const envVal = process.env[envKey];
    if (envVal !== undefined) {
      // Explicit "true"/"1" only. Memory: feedback_nestjs_boolean_env —
      // Boolean('false') === true in JS, so explicit comparison.
      return envVal === 'true' || envVal === '1';
    }

    // 2. Per-tenant override placeholder (Phase 7 admin UI).
    //    When a settings table lands, look it up here:
    //      const override = this.tenantOverrides.get(ctx.organizationId, key);
    //      if (override !== undefined) return override;

    // 3. Catalog default
    return FLAG_DEFAULTS[key];
  }

  /** Bulk-evaluate every catalog flag for a context. Used by /flags endpoint
   *  to hydrate the frontend in one round-trip. */
  all(ctx: EvalContext = {}): Record<FlagKey, boolean> {
    const out = {} as Record<FlagKey, boolean>;
    for (const k of Object.keys(FLAG_DEFAULTS) as FlagKey[]) {
      out[k] = this.isEnabled(k, ctx);
    }
    return out;
  }
}
