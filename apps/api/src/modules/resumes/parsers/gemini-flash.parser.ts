import { Injectable, Logger } from '@nestjs/common';
// NOT `import { type ConfigService }` — a type-only import is erased at compile
// time, so emitDecoratorMetadata records `Function` instead of the ConfigService
// token and Nest fails with "can't resolve dependencies ... at index [0]".
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';

import type { ConfidenceMap, ExtractionPayload } from '../types/extraction-payload';
import { ParsingError } from './parser-errors';
import type {
  ParseOpts,
  ParseResult,
  ResumeParserProviderAdapter,
} from './parser-provider.interface';

// Default model. `gemini-1.5-flash` was hardcoded here and has since been
// retired — the API now answers `404 models/gemini-1.5-flash is not found for
// API version v1beta`, which silently pushed every parse onto the RULE_BASED
// fallback while ParsingJob still reported SUCCEEDED. Override with GEMINI_MODEL.
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

// Per-1M-token rates used for per-tenant budget accounting on ParsingJob.costUsd.
// These MUST be checked against Google's current rate card when the model
// changes — they are not fetched at runtime. Override via env when rates move.
const DEFAULT_PRICE_INPUT_PER_1M = 0.3;
const DEFAULT_PRICE_OUTPUT_PER_1M = 2.5;

const PROMPT_VERSION = 'gemini-resume-v1';

/**
 * GeminiFlashParser — Google Gemini Flash via the @google/generative-ai SDK.
 *
 * Activation:
 *   GEMINI_API_KEY env var must be set. When absent, isAvailable() returns
 *   false and ParserRegistry skips this provider in the failover order.
 *
 * Prompt structure:
 *   System: "You extract structured data from resumes. Output STRICTLY valid
 *           JSON matching the schema below. Include per-field confidence."
 *   User:   <extractFields allowlist> + <customFields list> + <resume text>
 *
 * Response validation:
 *   Gemini's JSON output is parsed and shape-checked. Out-of-shape fields are
 *   dropped (PayloadStripper takes a second pass). If parsing fails outright,
 *   a `validation_failed` ParsingError is raised — the orchestrator will fall
 *   over to the next provider.
 *
 * Cost accounting:
 *   inputTokens / outputTokens are read from Gemini's usageMetadata; costUsd
 *   is computed from the public rate card. ParsingJob persists all three so
 *   per-org monthly budgets can be enforced.
 */
@Injectable()
export class GeminiFlashParser implements ResumeParserProviderAdapter {
  private readonly logger = new Logger(GeminiFlashParser.name);

  readonly name = 'GEMINI_FLASH' as const;
  /** Reported as ParsingJob.providerVersion — reflects the model actually used. */
  readonly version: string;
  readonly capabilities = {
    supportsConfidenceScores: true,
    supportsFieldProvenance: false,
    supportedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/rtf',
    ],
    maxBytes: 10 * 1024 * 1024,
  };

  private readonly apiKey: string | undefined;
  private readonly model: GenerativeModel | null;
  private readonly modelName: string;
  private readonly priceInputPer1M: number;
  private readonly priceOutputPer1M: number;

  constructor(config: ConfigService) {
    this.apiKey = config.get<string>('GEMINI_API_KEY') ?? process.env['GEMINI_API_KEY'];
    this.modelName =
      config.get<string>('GEMINI_MODEL') ?? process.env['GEMINI_MODEL'] ?? DEFAULT_GEMINI_MODEL;
    this.version = this.modelName;
    this.priceInputPer1M =
      Number(config.get<string>('GEMINI_PRICE_INPUT_PER_1M')) || DEFAULT_PRICE_INPUT_PER_1M;
    this.priceOutputPer1M =
      Number(config.get<string>('GEMINI_PRICE_OUTPUT_PER_1M')) || DEFAULT_PRICE_OUTPUT_PER_1M;

    if (this.apiKey) {
      const client = new GoogleGenerativeAI(this.apiKey);
      this.model = client.getGenerativeModel({
        model: this.modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      this.logger.log(`Gemini Flash parser initialised (model=${this.modelName})`);
    } else {
      this.model = null;
      this.logger.warn('GEMINI_API_KEY not set — Gemini Flash parser is inactive');
    }
  }

  isAvailable(): boolean {
    return !!this.model;
  }

  async parse(rawText: string, opts: ParseOpts): Promise<ParseResult> {
    if (!this.model) {
      throw new ParsingError('provider_unavailable', 'GEMINI_API_KEY not set');
    }
    if (!rawText?.trim()) {
      throw new ParsingError('permanent', 'Empty resume text — nothing to parse');
    }

    const prompt = this.buildPrompt(rawText, opts);

    let resp;
    try {
      resp = await this.model.generateContent(prompt);
    } catch (e: unknown) {
      throw this.classifyError(e);
    }

    const text = resp.response.text();
    let parsed: { payload: ExtractionPayload; confidence: ConfidenceMap };
    try {
      parsed = this.parseAndValidate(text);
    } catch (e: unknown) {
      throw new ParsingError(
        'validation_failed',
        `Gemini returned out-of-schema JSON: ${(e as Error).message}`,
        e,
      );
    }

    const usage = resp.response.usageMetadata;
    const inputTokens = usage?.promptTokenCount ?? 0;
    const outputTokens = usage?.candidatesTokenCount ?? 0;
    const costUsd =
      (inputTokens / 1_000_000) * this.priceInputPer1M +
      (outputTokens / 1_000_000) * this.priceOutputPer1M;

    return {
      payload: parsed.payload,
      confidence: parsed.confidence,
      inputTokens,
      outputTokens,
      costUsd,
      notes: [`prompt=${PROMPT_VERSION}`],
    };
  }

  // ── Prompt construction ───────────────────────────────────────────────────

  private buildPrompt(rawText: string, opts: ParseOpts): string {
    // Build the allow-list block so Gemini knows what to extract.
    const allow = JSON.stringify(opts.extractFields, null, 2);
    const customFields = opts.customFields?.length
      ? JSON.stringify(opts.customFields, null, 2)
      : '[]';

    // Cap resume text so we don't blow the context window; first 30k chars is
    // ~7k tokens which is well under Flash's 1M-token limit but a safe cap to
    // avoid runaway costs.
    const truncated = rawText.length > 30_000 ? rawText.slice(0, 30_000) : rawText;

    return [
      'You are a resume parser. Extract structured data from the resume below.',
      '',
      'Output STRICTLY valid JSON with this top-level shape:',
      '{',
      '  "payload":    { ... },           // ExtractionPayload (see schema)',
      '  "confidence": { "field.path": 0.0..1.0, ... }   // per-field confidence',
      '}',
      '',
      'ExtractionPayload schema (only include enabled fields):',
      '  identity:     { firstName, lastName, fullName, emails[], phones[], linkedinUrl, websites[], location:{city,state,country,raw} }',
      '  professional: { summary, currentCompany, currentTitle, skills:[{raw,category?,yearsOfExperience?}], experience:[{company,title,startDate,endDate,isCurrent,location,description,skills[]}] }',
      '  education:    [{ institution, degree, fieldOfStudy, startYear, endYear, grade }]',
      '  additional:   { certifications:[{name,issuer,issuedDate,expiresDate,credentialId,credentialUrl}], languages:[{name,proficiency}], projects:[{name,description,url,skills[]}] }',
      '  recruiting:   { noticePeriodDays, currentCtc:{amount,currency,period,raw}, expectedCtc:{...}, visaStatus, workAuthorization, availableFrom }',
      '  customFields: { <id>: <value> } for the custom field IDs listed below',
      '',
      'Rules:',
      '  - ONLY include fields enabled by the allowlist. Omit disabled fields entirely (do NOT use null).',
      '  - For each populated field, include a confidence (0..1) keyed by dotted path in the confidence object.',
      '  - Dates: ISO YYYY-MM-DD when possible, YYYY-MM otherwise.',
      '  - Phones: E.164 format when country can be inferred, else raw digits.',
      '  - skills[].raw: VERBATIM extraction string (do not normalise; that happens server-side).',
      '  - If a field cannot be confidently extracted, omit it.',
      '  - Do NOT invent data. Confidence < 0.4 means omit.',
      '',
      `Field allowlist for this organisation:\n${allow}`,
      '',
      `Custom fields requested by this organisation:\n${customFields}`,
      '',
      'Resume text:',
      '"""',
      truncated,
      '"""',
    ].join('\n');
  }

  // ── Response validation ───────────────────────────────────────────────────

  private parseAndValidate(text: string): {
    payload: ExtractionPayload;
    confidence: ConfidenceMap;
  } {
    let parsed: unknown;
    try {
      // Gemini sometimes wraps JSON in ```json fences despite responseMimeType.
      const stripped = text.replace(/^```(?:json)?\s*|\s*```$/g, '').trim();
      parsed = JSON.parse(stripped);
    } catch (e) {
      throw new Error(`JSON parse error: ${(e as Error).message}`);
    }
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Top-level response is not an object');
    }
    const root = parsed as { payload?: unknown; confidence?: unknown };
    const payload = (root.payload ?? {}) as ExtractionPayload;
    const confidence = (root.confidence ?? {}) as ConfidenceMap;
    if (typeof payload !== 'object' || typeof confidence !== 'object') {
      throw new Error('payload or confidence missing / wrong type');
    }
    return { payload, confidence };
  }

  // ── Error classification ──────────────────────────────────────────────────

  private classifyError(e: unknown): ParsingError {
    const msg = (e as Error)?.message ?? String(e);
    const lower = msg.toLowerCase();

    // The SDK embeds the HTTP status as "[404 Not Found]" / "[503 ...]". Match on
    // that bracketed form rather than a bare substring search.
    //
    // This previously tested `lower.includes('5')`, presumably meaning "5xx".
    // That matches the digit 5 ANYWHERE — including in the model name
    // `gemini-1.5-flash` — so a hard 404 was reported as `transient` and got
    // pointlessly retried through the whole BullMQ backoff chain.
    const status = /\[(\d{3})\s/.exec(msg)?.[1];

    if (status === '429' || lower.includes('rate limit') || lower.includes('quota')) {
      return new ParsingError('rate_limit', `Gemini rate-limited: ${msg}`, e);
    }
    if (status === '401' || status === '403' || lower.includes('api key') || lower.includes('unauthorized')) {
      return new ParsingError('provider_unavailable', `Gemini auth error: ${msg}`, e);
    }
    // A missing/unsupported model is a config error, not something to retry.
    if (status === '404' || lower.includes('is not found for api version')) {
      return new ParsingError(
        'permanent',
        `Gemini model unavailable (check GEMINI_MODEL): ${msg}`,
        e,
      );
    }
    if (status && status.startsWith('5')) {
      return new ParsingError('transient', `Gemini server error: ${msg}`, e);
    }
    // Network-level faults surface as an opaque `fetch failed`; the useful detail
    // is on `error.cause` (e.g. UNABLE_TO_GET_ISSUER_CERT_LOCALLY behind a
    // TLS-inspecting corporate proxy), so fold it into the message.
    const cause = (e as { cause?: { code?: string; message?: string } })?.cause;
    if (
      lower.includes('timeout') ||
      lower.includes('etimedout') ||
      lower.includes('econnreset') ||
      lower.includes('fetch failed')
    ) {
      const detail = cause?.code ?? cause?.message;
      return new ParsingError(
        'transient',
        `Gemini network error: ${msg}${detail ? ` (cause: ${detail})` : ''}`,
        e,
      );
    }
    return new ParsingError('permanent', `Gemini error: ${msg}`, e);
  }
}
