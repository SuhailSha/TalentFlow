import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '../../../database';
import type { ExtractedSkill, ExtractionPayload } from '../types/extraction-payload';

/**
 * Stage 4 — provider-agnostic normalisation.
 *
 * Cleans up extracted values so downstream consumers can rely on canonical
 * shapes regardless of which provider produced the data. Operations:
 *
 *   - emails: lowercase, trim
 *   - phones: strip whitespace + punctuation; preserve leading +
 *   - linkedinUrl / websites: scheme normalisation
 *   - skills: dedupe by raw-lowercase; resolve normalisedSkillId by exact match
 *             on Skill catalogue, then pg_trgm similarity ≥ 0.7
 *
 * The Skill normalisation here uses the EXISTING `skills` table + trigram
 * indexes from the search work. No new alias table is introduced in R2 —
 * curated aliases are R3 with reviewer feedback.
 */
@Injectable()
export class DataNormalizationService {
  constructor(private readonly db: PrismaService) {}

  async normalise(payload: ExtractionPayload): Promise<ExtractionPayload> {
    const out: ExtractionPayload = JSON.parse(JSON.stringify(payload));

    // ── Identity ────────────────────────────────────────────────────────────
    if (out.identity) {
      if (out.identity.emails) {
        out.identity.emails = Array.from(
          new Set(out.identity.emails.map((e) => e.toLowerCase().trim()).filter(Boolean)),
        );
      }
      if (out.identity.phones) {
        out.identity.phones = Array.from(
          new Set(out.identity.phones.map((p) => this.normalisePhone(p)).filter(Boolean)),
        );
      }
      if (out.identity.linkedinUrl) {
        out.identity.linkedinUrl = this.normaliseUrl(out.identity.linkedinUrl);
      }
      if (out.identity.websites) {
        out.identity.websites = Array.from(
          new Set(out.identity.websites.map((u) => this.normaliseUrl(u)).filter(Boolean)),
        );
      }
    }

    // ── Skills: dedupe + resolve canonical Skill.id ─────────────────────────
    if (out.professional?.skills?.length) {
      const skills = out.professional.skills;
      const deduped = this.dedupeSkills(skills);
      out.professional.skills = await this.resolveCanonicalSkills(deduped);
    }

    return out;
  }

  private normalisePhone(p: string): string {
    const cleaned = p.replace(/[^\d+]/g, '');
    // Multiple +'s? keep only the first.
    return cleaned.replace(/^\++/, '+');
  }

  private normaliseUrl(u: string): string {
    const trimmed = u.trim();
    if (!trimmed) return trimmed;
    if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
    return trimmed.replace(/^http:/i, 'http:').replace(/^https:/i, 'https:');
  }

  private dedupeSkills(skills: ExtractedSkill[]): ExtractedSkill[] {
    const seen = new Map<string, ExtractedSkill>();
    for (const s of skills) {
      const key = s.raw.toLowerCase().trim();
      if (!key) continue;
      const existing = seen.get(key);
      if (!existing) {
        seen.set(key, { ...s, raw: s.raw.trim() });
      } else {
        // Keep the higher-confidence record; merge years if both have them.
        if (s.confidence > existing.confidence) seen.set(key, { ...s, raw: s.raw.trim() });
        if (s.yearsOfExperience && !existing.yearsOfExperience) {
          existing.yearsOfExperience = s.yearsOfExperience;
        }
      }
    }
    return Array.from(seen.values());
  }

  /**
   * For each extracted skill, attempt to resolve to a row in the platform
   * Skill catalogue. Strategy: exact name match first, then pg_trgm similarity
   * via the existing GIN trigram index on Skill.name. The raw value is NEVER
   * overwritten; we only set `normalized`, `normalizedSkillId`, and `source`.
   */
  private async resolveCanonicalSkills(skills: ExtractedSkill[]): Promise<ExtractedSkill[]> {
    if (skills.length === 0) return skills;

    // 1) Exact match in one round trip
    const lowers = skills.map((s) => s.raw.toLowerCase());
    const exact = await this.db.skill.findMany({
      where: { name: { in: lowers } },
      select: { id: true, name: true, displayName: true },
    });
    const exactMap = new Map(exact.map((s) => [s.name.toLowerCase(), s]));

    const out: ExtractedSkill[] = [];
    const unresolved: Array<{ idx: number; raw: string }> = [];

    skills.forEach((s, idx) => {
      const hit = exactMap.get(s.raw.toLowerCase());
      if (hit) {
        out.push({
          ...s,
          normalized:        hit.displayName,
          normalizedSkillId: hit.id,
          source:            'EXACT',
          confidence:        Math.max(s.confidence, 0.95),
        });
      } else {
        out.push(s); // placeholder; may upgrade after trigram pass
        unresolved.push({ idx, raw: s.raw });
      }
    });

    // 2) Trigram fuzzy pass for everything else (one query per unresolved)
    for (const { idx, raw } of unresolved) {
      const candidates = await this.db.$queryRaw<Array<{ id: string; name: string; displayName: string; sim: number }>>(
        Prisma.sql`
          SELECT id, name, display_name AS "displayName",
                 similarity(name, ${raw.toLowerCase()}) AS sim
          FROM skills
          WHERE name % ${raw.toLowerCase()}
          ORDER BY sim DESC
          LIMIT 1
        `,
      );
      const top = candidates[0];
      if (top && top.sim >= 0.7) {
        out[idx] = {
          ...out[idx]!,
          normalized:        top.displayName,
          normalizedSkillId: top.id,
          source:            'TRIGRAM',
          confidence:        Math.min(out[idx]!.confidence, top.sim),
        };
      }
    }

    return out;
  }
}
