export type ResumeParserProvider =
  | 'RULE_BASED'
  | 'GEMINI_FLASH'
  | 'CLAUDE'
  | 'OPENAI_GPT'
  | 'AFFINDA'
  | 'RCHILLI';

export interface CustomExtractionField {
  id:           string;
  label:        string;
  group:        string;
  type:         'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN';
  description?: string;
}

export type ExtractFieldsTree = Record<string, Record<string, boolean>>;

export interface ExtractionConfig {
  id:                       string;
  organizationId:           string;
  preferredProvider:        ResumeParserProvider;
  fallbackProvider:         ResumeParserProvider | null;
  extractFields:            ExtractFieldsTree;
  customFields:             CustomExtractionField[];
  extractionRules:          Record<string, unknown>;
  reviewSlaHours:           number;
  claimTtlMinutes:          number;
  maxFileBytes:             number;
  monthlyParseBudgetUsd:    number | null;
  monthlyParseBudgetCount:  number | null;
  isDefault:                boolean;
  updatedAt:                string;
  updatedBy:                string | null;
}

export interface UpdateExtractionConfigDto {
  preferredProvider?:        ResumeParserProvider;
  fallbackProvider?:         ResumeParserProvider;
  extractFields?:            ExtractFieldsTree;
  customFields?:             CustomExtractionField[];
  extractionRules?:          Record<string, unknown>;
  reviewSlaHours?:           number;
  claimTtlMinutes?:          number;
  maxFileBytes?:             number;
  monthlyParseBudgetUsd?:    number;
  monthlyParseBudgetCount?:  number;
}

// ── Display ────────────────────────────────────────────────────────────────

export const PROVIDER_LABELS: Record<ResumeParserProvider, string> = {
  RULE_BASED:   'Rule-based',
  GEMINI_FLASH: 'Google Gemini Flash',
  CLAUDE:       'Anthropic Claude',
  OPENAI_GPT:   'OpenAI GPT',
  AFFINDA:      'Affinda',
  RCHILLI:      'RChilli',
};

export const EXTRACT_FIELD_CATEGORY_LABELS: Record<string, string> = {
  identity:     'Identity',
  professional: 'Professional',
  education:    'Education',
  additional:   'Additional',
  recruiting:   'Recruiting-specific',
};

export const EXTRACT_FIELD_LABELS: Record<string, Record<string, string>> = {
  identity: {
    name:     'Name',
    email:    'Email',
    phone:    'Phone',
    location: 'Location',
    linkedin: 'LinkedIn',
  },
  professional: {
    skills:         'Skills',
    experience:     'Experience',
    currentCompany: 'Current company',
    currentTitle:   'Current title',
  },
  education: {
    degree:      'Degree',
    institution: 'Institution',
  },
  additional: {
    certifications: 'Certifications',
    languages:      'Languages',
    projects:       'Projects',
  },
  recruiting: {
    noticePeriod:      'Notice period',
    currentCtc:        'Current CTC',
    expectedCtc:       'Expected CTC',
    visaStatus:        'Visa status',
    workAuthorization: 'Work authorization',
  },
};
