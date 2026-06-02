/**
 * Platform defaults for OrganizationExtractionConfig.
 *
 * Returned by GET /organization/extraction-config when a row hasn't been
 * created yet, and used as the seed for the upsert in updateConfig().
 *
 * extractFields groups are the categories enumerated in the Phase C brief.
 * Tenants can disable a whole category, individual fields within a category,
 * or add custom fields via customFields.
 */
export const DEFAULT_EXTRACT_FIELDS = {
  identity: {
    name:     true,
    email:    true,
    phone:    true,
    location: true,
    linkedin: true,
  },
  professional: {
    skills:         true,
    experience:     true,
    currentCompany: true,
    currentTitle:   true,
  },
  education: {
    degree:      true,
    institution: true,
  },
  additional: {
    certifications: true,
    languages:      false,
    projects:       false,
  },
  recruiting: {
    noticePeriod:       false,
    currentCtc:         false,
    expectedCtc:        false,
    visaStatus:         false,
    workAuthorization:  false,
  },
} as const;

export const DEFAULT_EXTRACTION_RULES = {
  ctcCurrency:                 'AUTO',     // AUTO | USD | INR | "USD,INR"
  noticePeriodUnit:            'DAYS',     // DAYS | WEEKS | MONTHS
  skillsConfidenceThreshold:   0.70,
  autoNormalizeSkillsOnExtract: true,
} as const;
