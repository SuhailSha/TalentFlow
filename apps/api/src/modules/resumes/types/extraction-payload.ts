/**
 * Canonical structured shape of a parsed resume.
 *
 * Stored on ExtractionResult.payload after passing through:
 *   ResumeParserProvider → DataNormalizationService → PayloadStripperService.
 *
 * Schema version 1 (see ExtractionResult.schemaVersion). When the shape
 * changes incompatibly, bump the version and add a migration adapter for
 * downstream consumers.
 *
 * Field-level confidence is stored separately on ExtractionResult.confidence
 * with dotted-path keys like "identity.email" or "professional.skills[0]".
 */

export const EXTRACTION_PAYLOAD_SCHEMA_VERSION = 1;

export interface ExtractionPayload {
  identity?: {
    firstName?:  string;
    lastName?:   string;
    fullName?:   string;
    emails?:     string[];
    phones?:     string[];     // E.164 where parseable
    linkedinUrl?: string;
    websites?:   string[];
    location?:   {
      city?:     string;
      state?:    string;
      country?:  string;
      raw?:      string;
    };
  };

  professional?: {
    summary?:       string;
    currentCompany?: string;
    currentTitle?:   string;
    skills?:        ExtractedSkill[];
    experience?:    ExtractedExperience[];
  };

  education?: ExtractedEducation[];

  additional?: {
    certifications?: ExtractedCertification[];
    languages?:      ExtractedLanguage[];
    projects?:       ExtractedProject[];
  };

  recruiting?: {
    noticePeriodDays?:    number;
    currentCtc?:          ExtractedCtc;
    expectedCtc?:         ExtractedCtc;
    visaStatus?:          string;
    workAuthorization?:   string;
    availableFrom?:       string;   // ISO date
  };

  /** Recruiter-defined extra fields enabled in OrganizationExtractionConfig. */
  customFields?: Record<string, unknown>;

  /** Unmapped resume sections retained for future re-parse. */
  rawSections?: Array<{ heading: string; content: string }>;
}

/**
 * Skill row — preserves both the raw extraction string AND the normalised
 * canonical mapping (if any). Raw is NEVER overwritten.
 */
export interface ExtractedSkill {
  raw:                string;
  normalized?:        string;
  normalizedSkillId?: string;
  category?:          string;
  yearsOfExperience?: number;
  lastUsedYear?:      number;
  source:             'EXACT' | 'TRIGRAM' | 'LLM_SUGGESTED' | 'NONE';
  confidence:         number;
}

export interface ExtractedExperience {
  company?:     string;
  title?:       string;
  startDate?:   string;          // ISO YYYY-MM or YYYY-MM-DD
  endDate?:     string;
  isCurrent?:   boolean;
  location?:    string;
  description?: string;
  skills?:      string[];
}

export interface ExtractedEducation {
  institution?:   string;
  degree?:        string;
  fieldOfStudy?:  string;
  startYear?:     number;
  endYear?:       number;
  grade?:         string;
}

export interface ExtractedCertification {
  name?:           string;
  issuer?:         string;
  issuedDate?:     string;
  expiresDate?:    string;
  credentialId?:   string;
  credentialUrl?:  string;
}

export interface ExtractedLanguage {
  name?:         string;
  proficiency?:  string;
}

export interface ExtractedProject {
  name?:        string;
  description?: string;
  url?:         string;
  skills?:      string[];
}

export interface ExtractedCtc {
  amount?:    number;
  currency?:  string;     // ISO 4217 best-effort
  period?:    'ANNUAL' | 'MONTHLY' | 'HOURLY';
  raw?:       string;     // verbatim from resume
}

export type ConfidenceMap = Record<string, number>;
