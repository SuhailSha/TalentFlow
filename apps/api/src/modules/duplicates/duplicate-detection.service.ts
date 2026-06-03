import { Injectable, Logger } from '@nestjs/common';
import { Prisma, type DuplicateConfidenceTier, type DuplicateRunTrigger } from '@repo/database';

import { PrismaService } from '../../database';
import { DuplicatesRepository } from './duplicates.repository';
import type { MatchReason } from './types/match.types';

const NAME_TRGM_FLOOR_POSSIBLE = 0.70;
const NAME_TRGM_FLOOR_PROBABLE = 0.85;
const SKILL_OVERLAP_FLOOR      = 0.50;
const POSSIBLE_SKILL_BUMP      = 0.10;
const NAME_TOP_K               = 50;
const SCORE_EXACT_EMAIL        = 1.00;
const SCORE_EXACT_PHONE        = 0.98;
const SCORE_EXACT_LINKEDIN     = 0.98;

/**
 * Internal accumulator — per target we keep the highest tier seen plus a
 * de-duplicated list of reasons. When we promote a target from POSSIBLE to
 * PROBABLE later in the run, we keep the earlier reason set and extend it.
 */
interface MatchBuilder {
  targetId:        string;
  tier:            DuplicateConfidenceTier;
  score:           number;
  reasons:         MatchReason[];
}

const TIER_RANK: Record<DuplicateConfidenceTier, number> = {
  EXACT: 3, PROBABLE: 2, POSSIBLE: 1,
};

@Injectable()
export class DuplicateDetectionService {
  private readonly logger = new Logger(DuplicateDetectionService.name);

  constructor(
    private readonly db:   PrismaService,
    private readonly repo: DuplicatesRepository,
  ) {}

  /**
   * Run detection for a source candidate. Always succeeds even if no matches
   * are found (returns a COMPLETED run with totalMatches=0). Failures are
   * recorded on the run row; never thrown to the caller, so the approve
   * flow can still proceed when detection itself crashes.
   *
   * `sourceOverride` lets callers supply the proposed scalar values (e.g.
   * recruiter-edited email/phone) WITHOUT mutating the candidate row first.
   * This is critical for the approve-flow gate: detection runs BEFORE writing
   * the new email to the DB, otherwise the unique constraint on
   * (organizationId, email) fires before we get a chance to warn.
   */
  async scan(input: {
    organizationId:    string;
    sourceCandidateId: string;
    triggeredBy:       DuplicateRunTrigger;
    triggeredById:     string;
    reviewTaskId?:     string | null;
    sourceOverride?: {
      firstName?:      string | null;
      lastName?:       string | null;
      email?:          string | null;
      phone?:          string | null;
      linkedinUrl?:    string | null;
      currentCompany?: string | null;
      city?:           string | null;
    };
  }) {
    const start = Date.now();
    const run = await this.repo.createRun(input);

    try {
      // Supersede any older pending matches against this source so the new
      // run is the only one carrying live decisions.
      await this.repo.supersedePriorPendingForSource(input.organizationId, input.sourceCandidateId);

      const loaded = await this.repo.loadCandidateForDetection(input.sourceCandidateId, input.organizationId);
      if (!loaded) {
        await this.repo.failRun(run.id, 'Source candidate not found', Date.now() - start);
        return { run, matches: [] };
      }
      // Merge override scalars on top of the loaded row. The candidate's id
      // and candidateSkills always come from the DB; everything else can be
      // virtually overridden for the duration of this scan.
      const o = input.sourceOverride ?? {};
      const source = {
        ...loaded,
        firstName:      o.firstName      ?? loaded.firstName,
        lastName:       o.lastName       ?? loaded.lastName,
        email:          o.email          ?? loaded.email,
        phone:          o.phone          ?? loaded.phone,
        linkedinUrl:    o.linkedinUrl    ?? loaded.linkedinUrl,
        currentCompany: o.currentCompany ?? loaded.currentCompany,
        city:           o.city           ?? loaded.city,
      };

      const builders = new Map<string, MatchBuilder>();

      // ── Tier 1: EXACT ───────────────────────────────────────────────────
      if (source.email) {
        const emailHits = await this.db.candidate.findMany({
          where: {
            organizationId: input.organizationId,
            id:             { not: source.id },
            email:          { equals: source.email, mode: 'insensitive' },
            deletedAt:      null,
          },
          select: { id: true },
        });
        for (const t of emailHits) {
          this.upsert(builders, t.id, 'EXACT', SCORE_EXACT_EMAIL, {
            kind: 'EMAIL_EXACT', label: 'Email matches exactly', value: source.email,
          });
        }
      }

      if (source.phone) {
        const sourcePhoneDigits = digitsOnly(source.phone);
        // Phone normalisation happens at write time, but be defensive — match
        // either the stored value or its digit-stripped form.
        const phoneHits = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          SELECT id FROM candidates
          WHERE organization_id = ${input.organizationId}::uuid
            AND id != ${source.id}::uuid
            AND deleted_at IS NULL
            AND phone IS NOT NULL
            AND regexp_replace(phone, '[^0-9]', '', 'g') = ${sourcePhoneDigits}
        `);
        for (const t of phoneHits) {
          this.upsert(builders, t.id, 'EXACT', SCORE_EXACT_PHONE, {
            kind: 'PHONE_EXACT', label: 'Phone matches exactly', value: source.phone,
          });
        }
      }

      if (source.linkedinUrl) {
        const normalised = normalizeLinkedin(source.linkedinUrl);
        if (normalised) {
          const liHits = await this.db.$queryRaw<Array<{ id: string }>>(Prisma.sql`
            SELECT id FROM candidates
            WHERE organization_id = ${input.organizationId}::uuid
              AND id != ${source.id}::uuid
              AND deleted_at IS NULL
              AND linkedin_url IS NOT NULL
              AND lower(regexp_replace(linkedin_url, '/$', '', 'g')) = ${normalised}
          `);
          for (const t of liHits) {
            this.upsert(builders, t.id, 'EXACT', SCORE_EXACT_LINKEDIN, {
              kind: 'LINKEDIN_EXACT', label: 'LinkedIn matches exactly', value: source.linkedinUrl,
            });
          }
        }
      }

      // ── Tier 2/3: name trigram + corroborating signals ──────────────────
      if (source.firstName && source.lastName) {
        const fullName = `${source.firstName} ${source.lastName}`.trim().toLowerCase();
        const candidates = await this.db.$queryRaw<Array<{
          id: string; first_name: string; last_name: string;
          current_company: string | null; city: string | null; phone: string | null;
          sim: number;
        }>>(Prisma.sql`
          SELECT id, first_name, last_name, current_company, city, phone,
                 similarity(lower(first_name || ' ' || last_name), ${fullName}) AS sim
          FROM candidates
          WHERE organization_id = ${input.organizationId}::uuid
            AND id != ${source.id}::uuid
            AND deleted_at IS NULL
            AND (
              first_name % ${source.firstName.toLowerCase()}
              OR last_name % ${source.lastName.toLowerCase()}
              OR lower(first_name || ' ' || last_name) % ${fullName}
            )
          ORDER BY sim DESC
          LIMIT ${NAME_TOP_K}
        `);

        for (const c of candidates) {
          const sim = Number(c.sim);
          if (sim < NAME_TRGM_FLOOR_POSSIBLE) continue;

          const reasons: MatchReason[] = [];
          let corroborated = false;

          if (sim >= NAME_TRGM_FLOOR_PROBABLE) {
            // Look for corroborating signals only when name match is strong.
            if (source.currentCompany && c.current_company
                && casefold(source.currentCompany) === casefold(c.current_company)) {
              reasons.push({ kind: 'NAME_COMPANY', label: 'Same employer', value: source.currentCompany });
              corroborated = true;
            }
            if (source.city && c.city && casefold(source.city) === casefold(c.city)) {
              reasons.push({ kind: 'NAME_LOCATION', label: 'Same city', value: source.city });
              corroborated = true;
            }
            if (source.phone && c.phone) {
              const a = digitsOnly(source.phone).slice(-4);
              const b = digitsOnly(c.phone).slice(-4);
              if (a && a.length === 4 && a === b) {
                reasons.push({ kind: 'NAME_PHONE_FRAGMENT', label: 'Last 4 phone digits match', value: a });
                corroborated = true;
              }
            }
          }

          // Name-similarity reason (always included so the recruiter sees it).
          reasons.unshift({
            kind: 'NAME_TRGM',
            label: `Name similarity ${Math.round(sim * 100)}%`,
            value: `${c.first_name} ${c.last_name}`,
            similarity: round3(sim),
          });

          if (corroborated) {
            this.upsertMany(builders, c.id, 'PROBABLE', Math.min(0.95, 0.7 + sim * 0.25), reasons);
          } else if (sim >= NAME_TRGM_FLOOR_POSSIBLE) {
            this.upsertMany(builders, c.id, 'POSSIBLE', round3(sim * 0.7), reasons);
          }
        }
      }

      // ── Tier 3 boost: skill overlap on POSSIBLE matches ─────────────────
      const sourceSkillIds = source.candidateSkills.map((s) => s.skillId);
      if (sourceSkillIds.length > 0) {
        const possibleTargets = Array.from(builders.values())
          .filter((b) => b.tier === 'POSSIBLE')
          .map((b) => b.targetId);

        if (possibleTargets.length > 0) {
          const skillRows = await this.db.candidateSkill.findMany({
            where: { candidateId: { in: possibleTargets } },
            select: { candidateId: true, skillId: true, skill: { select: { displayName: true, name: true } } },
          });
          const byTarget = new Map<string, Set<string>>();
          const skillNames = new Map<string, string>();
          for (const r of skillRows) {
            if (!byTarget.has(r.candidateId)) byTarget.set(r.candidateId, new Set());
            byTarget.get(r.candidateId)!.add(r.skillId);
            skillNames.set(r.skillId, r.skill.displayName ?? r.skill.name);
          }
          const sourceSet = new Set<string>(sourceSkillIds);
          for (const targetId of possibleTargets) {
            const tgtSet = byTarget.get(targetId) ?? new Set<string>();
            const inter = [...sourceSet].filter((s) => tgtSet.has(s));
            const overlap = sourceSet.size === 0 ? 0 : inter.length / sourceSet.size;
            if (overlap >= SKILL_OVERLAP_FLOOR) {
              const b = builders.get(targetId)!;
              const sample = inter.slice(0, 3).map((id) => skillNames.get(id) ?? '').filter(Boolean).join(', ');
              b.reasons.push({
                kind: 'SKILL_OVERLAP',
                label: `${Math.round(overlap * 100)}% of skills match${sample ? ` (incl. ${sample})` : ''}`,
                similarity: round3(overlap),
              });
              b.score = Math.min(0.95, round3(b.score + POSSIBLE_SKILL_BUMP));
            }
          }
        }
      }

      // ── Persist matches ─────────────────────────────────────────────────
      const matches = Array.from(builders.values()).map((b) => ({
        runId:             run.id,
        organizationId:    input.organizationId,
        sourceCandidateId: input.sourceCandidateId,
        targetCandidateId: b.targetId,
        confidenceTier:    b.tier,
        confidenceScore:   round3(b.score),
        matchReasons:      b.reasons,
      }));
      await this.repo.createMatches(matches);

      // Carry forward prior NOT_DUPLICATE decisions on the same (source,
      // target) pairs so the recruiter doesn't have to repeat themselves
      // every time a re-scan runs.
      const propagated = await this.repo.propagatePriorNotDuplicateDecisions(run.id, input.organizationId);
      if (propagated > 0) {
        this.logger.debug({ runId: run.id, propagated }, 'Propagated prior NOT_DUPLICATE decisions');
      }

      const counts = {
        total:    matches.length,
        exact:    matches.filter((m) => m.confidenceTier === 'EXACT').length,
        probable: matches.filter((m) => m.confidenceTier === 'PROBABLE').length,
        possible: matches.filter((m) => m.confidenceTier === 'POSSIBLE').length,
      };
      const completed = await this.repo.completeRun(run.id, counts, Date.now() - start);
      this.logger.debug({ runId: run.id, ...counts }, 'Duplicate scan complete');
      return { run: completed, matches };
    } catch (e: unknown) {
      this.logger.error({ err: (e as Error).message, runId: run.id }, 'Duplicate scan failed');
      await this.repo.failRun(run.id, (e as Error).message, Date.now() - start);
      return { run, matches: [] };
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Add a single reason; upgrade tier/score when a better signal arrives. */
  private upsert(
    map: Map<string, MatchBuilder>, targetId: string,
    tier: DuplicateConfidenceTier, score: number, reason: MatchReason,
  ): void {
    this.upsertMany(map, targetId, tier, score, [reason]);
  }

  private upsertMany(
    map: Map<string, MatchBuilder>, targetId: string,
    tier: DuplicateConfidenceTier, score: number, reasons: MatchReason[],
  ): void {
    const existing = map.get(targetId);
    if (!existing) {
      map.set(targetId, { targetId, tier, score, reasons: [...reasons] });
      return;
    }
    // Higher tier wins; keep the better score; merge reasons (dedup by kind+value).
    const tierNow = TIER_RANK[existing.tier] >= TIER_RANK[tier] ? existing.tier : tier;
    const scoreNow = Math.max(existing.score, score);
    const merged = [...existing.reasons];
    for (const r of reasons) {
      const dup = merged.some((x) => x.kind === r.kind && x.value === r.value);
      if (!dup) merged.push(r);
    }
    map.set(targetId, { targetId, tier: tierNow, score: scoreNow, reasons: merged });
  }
}

// ── Module-local helpers ─────────────────────────────────────────────────────

function digitsOnly(s: string): string { return s.replace(/[^0-9]/g, ''); }

function casefold(s: string): string { return s.trim().toLowerCase(); }

function round3(n: number): number { return Math.round(n * 1000) / 1000; }

function normalizeLinkedin(url: string): string | null {
  const t = url.trim().toLowerCase();
  if (!t) return null;
  return t.replace(/^https?:\/\//, '').replace(/\/$/, '');
}
