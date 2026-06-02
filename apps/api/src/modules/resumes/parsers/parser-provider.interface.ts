import type { ResumeParserProvider } from '@repo/database';

import type { ConfidenceMap, ExtractionPayload } from '../types/extraction-payload';

/**
 * Per-org parsing input — which fields to attempt + recruiter-defined extras.
 * Built from OrganizationExtractionConfig and passed to providers so the
 * extraction is shaped by tenant settings, not the provider's defaults.
 *
 * Note: the PayloadStripper is the AUTHORITATIVE enforcement point. Providers
 * are merely informed of the allowlist so they can avoid wasting tokens on
 * fields the org has disabled.
 */
export interface ParseOpts {
  organizationId: string;
  extractFields:  Record<string, Record<string, boolean>>;
  customFields:   Array<{ id: string; label: string; group: string; type: string; description?: string }>;
  extractionRules?: Record<string, unknown>;
  /** When non-zero, providers should bail if their estimated tokens exceed this. */
  maxOutputTokens?: number;
}

export interface ParseResult {
  payload:    ExtractionPayload;
  confidence: ConfidenceMap;
  /** Token + cost accounting (AI providers only). */
  inputTokens?:  number;
  outputTokens?: number;
  costUsd?:      number;
  /** Provider-specific debug blob. Not persisted unless verbose mode. */
  rawProviderJson?: unknown;
  /** Optional provenance: which provider produced this, for the metadata trail. */
  notes?: string[];
}

export interface ProviderCapabilities {
  supportsConfidenceScores: boolean;
  supportsFieldProvenance:  boolean;
  supportedMimeTypes:       string[];
  maxBytes:                 number;
}

export interface ResumeParserProviderAdapter {
  readonly name:    ResumeParserProvider;
  readonly version: string;
  readonly capabilities: ProviderCapabilities;

  /**
   * True if the provider can run right now (SDK installed, env vars present,
   * dependencies reachable). Registry uses this to skip Gemini when the API
   * key isn't set, etc.
   */
  isAvailable(): boolean;

  /**
   * Parse the extracted resume text into a structured payload.
   * Throws ParsingError on any failure — orchestrator catches and either
   * retries the same provider or fails over to the next.
   */
  parse(rawText: string, opts: ParseOpts): Promise<ParseResult>;
}

/** DI token for the array of registered providers. */
export const RESUME_PARSER_PROVIDERS = Symbol('RESUME_PARSER_PROVIDERS');
