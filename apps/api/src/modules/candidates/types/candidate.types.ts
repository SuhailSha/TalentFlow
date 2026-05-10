import type {
  AvailabilityStatus,
  Candidate,
  CandidateNote,
  CandidateSkill,
  CandidateSource,
  CandidateStatus,
  NoteType,
  ProficiencyLevel,
  Skill,
  SkillCategory,
} from '@repo/database';

// ── Skill view ────────────────────────────────────────────────────────────────

export interface SkillView {
  id: string;
  name: string;
  displayName: string;
  category: SkillCategory;
  aliases: string[];
}

export interface CandidateSkillView {
  id: string;
  skill: SkillView;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience: number | null;
  isPrimary: boolean;
  assignedAt: Date;
}

// ── Note view ─────────────────────────────────────────────────────────────────

export interface CandidateNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: Date;
}

// ── Candidate views ───────────────────────────────────────────────────────────

/** Lightweight row for list page — top skills included, no notes. */
export interface CandidateListItem {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string; // computed: `${firstName} ${lastName}`
  phone: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  experienceYears: number | null; // computed from careerStartDate
  location: string | null; // computed: "City, Country" or just "Country"
  isRemote: boolean;
  status: CandidateStatus;
  availabilityStatus: AvailabilityStatus;
  availableFrom: Date | null;
  source: CandidateSource;
  topSkills: CandidateSkillView[]; // isPrimary=true first, then by proficiency, max 5
  lastActivityAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Full profile for detail page — all skills + recent notes. */
export interface CandidateDetail extends CandidateListItem {
  linkedinUrl: string | null;
  githubUrl: string | null;
  portfolioUrl: string | null;
  city: string | null;
  stateProvince: string | null;
  country: string | null;
  timezone: string | null;
  summary: string | null;
  salaryExpectationMin: number | null;
  salaryExpectationMax: number | null;
  salaryCurrency: string | null;
  careerStartDate: Date | null;
  resumeFileName: string | null;
  resumeUploadedAt: Date | null;
  sourceDetail: string | null;
  allSkills: CandidateSkillView[]; // full skills list
  notes: CandidateNoteView[];
  createdBy: string | null;
  updatedBy: string | null;
}

/** Potential duplicate returned alongside a 201 Created response. */
export interface PotentialDuplicate {
  id: string;
  fullName: string;
  email: string;
  currentTitle: string | null;
}

// ── Prisma includes ───────────────────────────────────────────────────────────

/** Prisma include clause for list queries (top 5 skills only). */
export const CANDIDATE_LIST_INCLUDE = {
  candidateSkills: {
    include: { skill: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }] as { isPrimary?: 'asc' | 'desc'; assignedAt?: 'asc' | 'desc' }[],
    take: 5,
  },
};

/** Prisma include clause for detail queries (all skills + recent 20 notes). */
export const CANDIDATE_DETAIL_INCLUDE = {
  candidateSkills: {
    include: { skill: true },
    orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }] as { isPrimary?: 'asc' | 'desc'; assignedAt?: 'asc' | 'desc' }[],
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
};

// ── Mappers ───────────────────────────────────────────────────────────────────

export function computeExperienceYears(careerStartDate: Date | null): number | null {
  if (!careerStartDate) return null;
  const msPerYear = 365.25 * 24 * 60 * 60 * 1_000;
  return Math.floor((Date.now() - careerStartDate.getTime()) / msPerYear);
}

export function computeLocation(
  city: string | null,
  country: string | null,
): string | null {
  if (city && country) return `${city}, ${country}`;
  return city ?? country ?? null;
}

type CandidateWithSkills = Candidate & {
  candidateSkills: Array<CandidateSkill & { skill: Skill }>;
};

type CandidateWithAll = CandidateWithSkills & {
  notes: CandidateNote[];
};

function mapSkillView(cs: CandidateSkill & { skill: Skill }): CandidateSkillView {
  return {
    id: cs.id,
    skill: {
      id: cs.skill.id,
      name: cs.skill.name,
      displayName: cs.skill.displayName,
      category: cs.skill.category,
      aliases: cs.skill.aliases,
    },
    proficiencyLevel: cs.proficiencyLevel,
    yearsOfExperience: cs.yearsOfExperience,
    isPrimary: cs.isPrimary,
    assignedAt: cs.assignedAt,
  };
}

export function toCandidateListItem(c: CandidateWithSkills): CandidateListItem {
  return {
    id: c.id,
    organizationId: c.organizationId,
    email: c.email,
    firstName: c.firstName,
    lastName: c.lastName,
    fullName: `${c.firstName} ${c.lastName}`,
    phone: c.phone,
    currentTitle: c.currentTitle,
    currentCompany: c.currentCompany,
    experienceYears: computeExperienceYears(c.careerStartDate),
    location: computeLocation(c.city, c.country),
    isRemote: c.isRemote,
    status: c.status,
    availabilityStatus: c.availabilityStatus,
    availableFrom: c.availableFrom,
    source: c.source,
    topSkills: c.candidateSkills.map(mapSkillView),
    lastActivityAt: c.lastActivityAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export function toCandidateDetail(
  c: CandidateWithAll,
): CandidateDetail {
  const base = toCandidateListItem(c);
  return {
    ...base,
    linkedinUrl: c.linkedinUrl,
    githubUrl: c.githubUrl,
    portfolioUrl: c.portfolioUrl,
    city: c.city,
    stateProvince: c.stateProvince,
    country: c.country,
    timezone: c.timezone,
    summary: c.summary,
    salaryExpectationMin: c.salaryExpectationMin,
    salaryExpectationMax: c.salaryExpectationMax,
    salaryCurrency: c.salaryCurrency,
    careerStartDate: c.careerStartDate,
    resumeFileName: c.resumeFileName,
    resumeUploadedAt: c.resumeUploadedAt,
    sourceDetail: c.sourceDetail,
    allSkills: c.candidateSkills.map(mapSkillView),
    notes: c.notes.map((n) => ({
      id: n.id,
      content: n.content,
      noteType: n.noteType,
      authorId: n.authorId,
      authorEmail: n.authorEmail,
      authorName: n.authorName,
      createdAt: n.createdAt,
    })),
    createdBy: c.createdBy,
    updatedBy: c.updatedBy,
  };
}
