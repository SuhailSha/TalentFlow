import type {
  EmploymentType,
  ImportanceLevel,
  JobDescription,
  JobNote,
  JobPriority,
  JobSkill,
  JobStatus,
  NoteType,
  SalaryType,
  Skill,
  SkillCategory,
  WorkMode,
} from '@repo/database';

// ── Skill view ────────────────────────────────────────────────────────────────

export interface SkillView {
  id: string;
  name: string;
  displayName: string;
  category: SkillCategory;
}

export interface JobSkillView {
  id: string;
  skill: SkillView;
  isRequired: boolean;
  importanceLevel: ImportanceLevel;
  minimumYears: number | null;
  addedAt: Date;
}

// ── Note view ─────────────────────────────────────────────────────────────────

export interface JobNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: Date;
}

// ── Job views ─────────────────────────────────────────────────────────────────

export interface JobListItem {
  id: string;
  organizationId: string;
  reqId: string;
  title: string;
  department: string | null;
  employmentType: EmploymentType;
  workMode: WorkMode;
  status: JobStatus;
  hiringPriority: JobPriority;
  hiringManagerId: string | null;
  hiringManagerName: string | null;
  openPositions: number;
  filledPositions: number;
  experienceMin: number | null;
  experienceMax: number | null;
  city: string | null;
  country: string | null;
  targetHireDate: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  // Top 5 skills — required first, then by importance
  topSkills: JobSkillView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface JobDetail extends JobListItem {
  stateProvince: string | null;
  timezone: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryType: SalaryType;
  description: string | null;
  requirements: string | null;
  niceToHave: string | null;
  benefits: string | null;
  allSkills: JobSkillView[];
  notes: JobNoteView[];
  createdBy: string | null;
  updatedBy: string | null;
}

// ── Prisma includes ───────────────────────────────────────────────────────────

export const JOB_LIST_INCLUDE = {
  jobSkills: {
    include: { skill: true },
    orderBy: [{ isRequired: 'desc' }, { importanceLevel: 'desc' }, { addedAt: 'asc' }] as {
      isRequired?: 'asc' | 'desc';
      importanceLevel?: 'asc' | 'desc';
      addedAt?: 'asc' | 'desc';
    }[],
    take: 5,
  },
} as const;

export const JOB_DETAIL_INCLUDE = {
  jobSkills: {
    include: { skill: true },
    orderBy: [{ isRequired: 'desc' }, { importanceLevel: 'desc' }, { addedAt: 'asc' }] as {
      isRequired?: 'asc' | 'desc';
      importanceLevel?: 'asc' | 'desc';
      addedAt?: 'asc' | 'desc';
    }[],
  },
  notes: {
    orderBy: { createdAt: 'desc' as const },
    take: 50,
  },
} as const;

// ── Mappers ───────────────────────────────────────────────────────────────────

type JobWithSkills = JobDescription & {
  jobSkills: Array<JobSkill & { skill: Skill }>;
};

type JobWithAll = JobWithSkills & {
  notes: JobNote[];
};

function mapJobSkillView(js: JobSkill & { skill: Skill }): JobSkillView {
  return {
    id: js.id,
    skill: {
      id: js.skill.id,
      name: js.skill.name,
      displayName: js.skill.displayName,
      category: js.skill.category,
    },
    isRequired: js.isRequired,
    importanceLevel: js.importanceLevel,
    minimumYears: js.minimumYears,
    addedAt: js.addedAt,
  };
}

export function toJobListItem(j: JobWithSkills): JobListItem {
  return {
    id: j.id,
    organizationId: j.organizationId,
    reqId: j.reqId,
    title: j.title,
    department: j.department,
    employmentType: j.employmentType,
    workMode: j.workMode,
    status: j.status,
    hiringPriority: j.hiringPriority,
    hiringManagerId: j.hiringManagerId,
    hiringManagerName: j.hiringManagerName,
    openPositions: j.openPositions,
    filledPositions: j.filledPositions,
    experienceMin: j.experienceMin,
    experienceMax: j.experienceMax,
    city: j.city,
    country: j.country,
    targetHireDate: j.targetHireDate,
    openedAt: j.openedAt,
    closedAt: j.closedAt,
    topSkills: j.jobSkills.map(mapJobSkillView),
    createdAt: j.createdAt,
    updatedAt: j.updatedAt,
  };
}

export function toJobDetail(j: JobWithAll): JobDetail {
  const base = toJobListItem(j);
  return {
    ...base,
    stateProvince: j.stateProvince,
    timezone: j.timezone,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryCurrency: j.salaryCurrency,
    salaryType: j.salaryType,
    description: j.description,
    requirements: j.requirements,
    niceToHave: j.niceToHave,
    benefits: j.benefits,
    allSkills: j.jobSkills.map(mapJobSkillView),
    notes: j.notes.map((n: JobNote) => ({
      id: n.id,
      content: n.content,
      noteType: n.noteType,
      authorId: n.authorId,
      authorEmail: n.authorEmail,
      authorName: n.authorName,
      createdAt: n.createdAt,
    })),
    createdBy: j.createdBy,
    updatedBy: j.updatedBy,
  };
}
