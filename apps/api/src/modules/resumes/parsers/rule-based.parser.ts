import { Injectable } from '@nestjs/common';

import type { ConfidenceMap, ExtractedSkill, ExtractionPayload } from '../types/extraction-payload';
import type { ParseOpts, ParseResult, ResumeParserProviderAdapter } from './parser-provider.interface';

const EMAIL_RE     = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_RE     = /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}/g;
const LINKEDIN_RE  = /https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+\/?/i;
const WEBSITE_RE   = /https?:\/\/[^\s]+/g;
const SKILLS_HEADING_RE = /^\s*(skills?|technical\s+skills?|core\s+competencies)[:\s]*$/im;

/**
 * Deterministic regex/heuristic parser. Always available — no external
 * dependencies, no API keys, no network. Acts as the failover safety net
 * when Gemini and any other AI provider is unavailable.
 *
 * Confidence semantics:
 *   - 0.95: regex-matched (email, LinkedIn URL)
 *   - 0.75: parsed but heuristic (phone, name from header)
 *   - 0.60: extracted but ambiguous (skill list)
 *   - 0.00: not present
 */
@Injectable()
export class RuleBasedParser implements ResumeParserProviderAdapter {
  readonly name = 'RULE_BASED' as const;
  readonly version = 'rule-based-1.0.0';
  readonly capabilities = {
    supportsConfidenceScores: true,
    supportsFieldProvenance:  false,
    supportedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
    maxBytes: 10 * 1024 * 1024,
  };

  isAvailable(): boolean { return true; }

  async parse(rawText: string, _opts: ParseOpts): Promise<ParseResult> {
    const payload:    ExtractionPayload = {};
    const confidence: ConfidenceMap = {};
    const text = rawText ?? '';

    // ── Identity ───────────────────────────────────────────────────────────
    const emails = Array.from(new Set(text.match(EMAIL_RE) ?? []));
    const linkedinMatch = text.match(LINKEDIN_RE);
    const websites = Array.from(new Set((text.match(WEBSITE_RE) ?? []).filter((u) => !LINKEDIN_RE.test(u))));
    // Phones are tricky — keep digit-rich matches only.
    const phones = Array.from(
      new Set(
        (text.match(PHONE_RE) ?? [])
          .map((p) => p.replace(/[^\d+]/g, ''))
          .filter((p) => p.length >= 7 && p.length <= 16),
      ),
    );

    // Name heuristic — first non-empty line that's <= 80 chars and not an email/URL.
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let fullName: string | undefined;
    for (const ln of lines.slice(0, 5)) {
      if (EMAIL_RE.test(ln) || WEBSITE_RE.test(ln)) continue;
      if (ln.length > 80) continue;
      // crude proper-name shape: 2-4 capitalised words
      if (/^([A-Z][A-Za-z'-]+\s+){1,3}[A-Z][A-Za-z'-]+$/.test(ln)) {
        fullName = ln;
        break;
      }
    }

    const identity: NonNullable<ExtractionPayload['identity']> = {};
    if (fullName) {
      const parts = fullName.split(/\s+/);
      identity.firstName = parts[0];
      identity.lastName  = parts[parts.length - 1];
      identity.fullName  = fullName;
      confidence['identity.firstName'] = 0.75;
      confidence['identity.lastName']  = 0.75;
      confidence['identity.fullName']  = 0.75;
    }
    if (emails.length) {
      identity.emails = emails;
      confidence['identity.emails'] = 0.95;
    }
    if (phones.length) {
      identity.phones = phones;
      confidence['identity.phones'] = 0.7;
    }
    if (linkedinMatch?.[0]) {
      identity.linkedinUrl = linkedinMatch[0];
      confidence['identity.linkedinUrl'] = 0.95;
    }
    if (websites.length) {
      identity.websites = websites;
      confidence['identity.websites'] = 0.85;
    }
    if (Object.keys(identity).length) payload.identity = identity;

    // ── Skills (heuristic: read the line after a "Skills:" heading) ───────
    const skills = this.extractSkills(text);
    if (skills.length) {
      payload.professional = { skills };
      confidence['professional.skills'] = 0.6;
    }

    // ── Raw sections (everything else) — kept verbatim for future re-parse
    payload.rawSections = [{ heading: 'full-text', content: text.slice(0, 8000) }];

    return { payload, confidence, notes: ['rule-based fallback'] };
  }

  private extractSkills(text: string): ExtractedSkill[] {
    const skills: ExtractedSkill[] = [];
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';
      if (SKILLS_HEADING_RE.test(line)) {
        // collect the next 1-3 lines as comma/bullet-separated tokens
        const window = lines.slice(i + 1, i + 4).join(', ');
        const tokens = window
          .split(/[•·,;|/]+/)
          .map((t) => t.trim())
          .filter((t) => t.length >= 2 && t.length <= 50);
        for (const raw of tokens) {
          if (!skills.some((s) => s.raw.toLowerCase() === raw.toLowerCase())) {
            skills.push({ raw, source: 'NONE', confidence: 0.6 });
          }
        }
        break;
      }
    }
    return skills;
  }
}
