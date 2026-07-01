import { Injectable } from '@nestjs/common';
import * as crypto from 'node:crypto';

import { PrismaService } from '../database';

import type { CandidateSummaryInput } from './prompts/candidate-summary/v1';

/**
 * ContextAssemblerService — TF-1.5-6.
 *
 * Builds the input payload for an AI call from the canonical database
 * records. Two responsibilities:
 *
 *   1. Assemble — fetch the resume excerpt, recent notes, jobs in
 *      consideration, etc. The assembler decides which records and how
 *      much of each are sent.
 *
 *   2. Hash — compute a `contextHash` over the assembled input
 *      identifiers (NOT the values). Used as part of the AI cache key
 *      so that identical inputs return cached output without
 *      re-calling the model.
 *
 * Boundary discipline:
 *   - The assembler knows about the schema (Prisma) but does NOT know
 *     about LLM providers. It returns plain objects.
 *   - It also does NOT inject system prompts. Those live in the prompt
 *     registry. Separation makes prompt-tuning isolated.
 *
 * Privacy:
 *   - Resume content is excerpted (default 4000 chars). The full file
 *     is not sent; the model's job is summarization, not full ingestion.
 *   - Interview notes carry the author's display name + date but NOT
 *     authorId. Authorship is informative for the model ("Alice flagged
 *     X") but the model doesn't need to identify individuals beyond
 *     that.
 *
 * Cache key shape (per ADR-004 §6):
 *   ai:{tenantId}:{useCase}:{subjectId}:{contextHash}:{promptVersion}
 *
 * @see docs/architecture/adr/adr-004-ai-architecture.md §5
 */

interface CandidateSummaryAssemblyInput {
  candidateId: string;
  organizationId: string;
  /** Optional: jobs to ground "best fit" suggestions. Pass active openings. */
  jobsConsidered?: Array<{ id: string; reqId: string; title: string }>;
  /** How much resume text to include. Capped at 4000 chars. */
  resumeMaxChars?: number;
  /** How many recent notes. Capped at 5. */
  noteLimit?: number;
}

interface AssembledContext<TInput> {
  input:        TInput;
  contextHash:  string;
  /** The source records that contributed to this context. Mirrors what the
   *  model's `sources[]` array should reference. Used by the AiService to
   *  cross-validate that the model cited only inputs we provided. */
  sourceIds: {
    resumeVersionIds: string[];
    interviewNoteIds: string[];
    jobIds:           string[];
  };
}

@Injectable()
export class ContextAssemblerService {
  constructor(private readonly prisma: PrismaService) {}

  async assembleCandidateSummary(
    args: CandidateSummaryAssemblyInput,
  ): Promise<AssembledContext<CandidateSummaryInput>> {
    const resumeMax = Math.min(args.resumeMaxChars ?? 4000, 8000);
    const noteCap   = Math.min(args.noteLimit ?? 5, 10);

    // ── Candidate basics ────────────────────────────────────────────
    // NB: relies on the tenant context being set when the caller is
    // app_tenant-scoped. For Phase 6 we'll wire the AsyncLocalStorage;
    // for now we filter explicitly by organizationId per defense-in-depth.
    const candidate = await this.prisma.candidate.findFirst({
      where: { id: args.candidateId, organizationId: args.organizationId, deletedAt: null },
      select: {
        firstName: true,
        lastName:  true,
        currentTitle:  true,
        currentCompany: true,
      },
    });
    if (!candidate) {
      throw new Error(`Candidate ${args.candidateId} not found in org ${args.organizationId}`);
    }

    // ── Latest resume version + extraction text excerpt ────────────
    // We prefer the parsed plain-text extraction over the raw file
    // (lighter to send + already de-formatted). The schema names the
    // relation `extractions` (array; latest first by createdAt).
    const latestVersion = await this.prisma.resumeVersion.findFirst({
      where: {
        organizationId: args.organizationId,
        resume:         { candidateId: args.candidateId, deletedAt: null },
      },
      orderBy: { uploadedAt: 'desc' },
      select: {
        id: true,
        extractions: {
          orderBy: { createdAt: 'desc' },
          take:    1,
          select:  { rawText: true },
        },
      },
    });
    const resumeExcerpt = latestVersion?.extractions[0]?.rawText
      ? latestVersion.extractions[0].rawText.slice(0, resumeMax)
      : undefined;
    const resumeVersionId = latestVersion?.id;

    // ── Recent notes (private candidate notes) ─────────────────────
    const notes = await this.prisma.candidateNote.findMany({
      where:   { candidateId: args.candidateId, organizationId: args.organizationId },
      orderBy: { createdAt: 'desc' },
      take:    noteCap,
      select: {
        id:         true,
        content:    true,
        authorName: true,
        createdAt:  true,
      },
    });

    // ── Build the typed input the prompt registry expects ─────────
    const input: CandidateSummaryInput = {
      candidate: {
        firstName:      candidate.firstName,
        lastName:       candidate.lastName,
        currentTitle:   candidate.currentTitle ?? undefined,
        currentCompany: candidate.currentCompany ?? undefined,
      },
      resumeVersionId,
      resumeExcerpt,
      interviewNotes: notes.map((n) => ({
        id:         n.id,
        authorName: n.authorName ?? 'recruiter',
        createdAt:  n.createdAt.toISOString().slice(0, 10),
        content:    n.content,
      })),
      jobsConsidered: args.jobsConsidered,
    };

    // ── Hash for cache key. ID-based (not value-based) so re-running
    //     the same identifiers produces a cache hit. Resume content
    //     changes flip the resumeVersionId → cache miss → regenerate.
    const sourceIds = {
      resumeVersionIds: resumeVersionId ? [resumeVersionId] : [],
      interviewNoteIds: notes.map((n) => n.id),
      jobIds:           args.jobsConsidered?.map((j) => j.id) ?? [],
    };

    const contextHash = hashIds({
      candidateId: args.candidateId,
      ...sourceIds,
    });

    return { input, contextHash, sourceIds };
  }
}

/**
 * Deterministic SHA-256 over sorted source identifiers. Stable across
 * runs; same input → same hash. Used as part of the AI cache key.
 */
function hashIds(parts: Record<string, string | string[]>): string {
  const flat: string[] = [];
  for (const key of Object.keys(parts).sort()) {
    const val = parts[key];
    if (Array.isArray(val)) {
      flat.push(key + ':' + [...val].sort().join(','));
    } else {
      flat.push(key + ':' + val);
    }
  }
  return crypto.createHash('sha256').update(flat.join('|')).digest('hex');
}
