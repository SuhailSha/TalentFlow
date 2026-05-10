import type { NoteType } from './candidates';

export type JobStatus = 'DRAFT' | 'OPEN' | 'ON_HOLD' | 'FILLED' | 'CANCELLED' | 'ARCHIVED';
export type JobPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'CONTRACT_TO_HIRE' | 'FREELANCE' | 'INTERNSHIP';
export type WorkMode = 'ONSITE' | 'REMOTE' | 'HYBRID';
export type SalaryType = 'ANNUAL' | 'HOURLY' | 'MONTHLY' | 'TOTAL_COMPENSATION';
export type ImportanceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface JobSkillView {
  id: string;
  skill: { id: string; name: string; displayName: string; category: string };
  isRequired: boolean;
  importanceLevel: ImportanceLevel;
  minimumYears: number | null;
  addedAt: string;
}

export interface JobNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  authorId: string | null;
  authorEmail: string | null;
  authorName: string | null;
  createdAt: string;
}

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
  targetHireDate: string | null;
  openedAt: string | null;
  closedAt: string | null;
  topSkills: JobSkillView[];
  createdAt: string;
  updatedAt: string;
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

export interface CreateJobDto {
  title: string;
  department?: string;
  employmentType?: EmploymentType;
  workMode?: WorkMode;
  hiringPriority?: JobPriority;
  hiringManagerId?: string;
  hiringManagerName?: string;
  openPositions?: number;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryType?: SalaryType;
  city?: string;
  stateProvince?: string;
  country?: string;
  timezone?: string;
  description?: string;
  requirements?: string;
  niceToHave?: string;
  benefits?: string;
  targetHireDate?: string;
}

export type UpdateJobDto = Partial<CreateJobDto>;

export interface AssignJobSkillDto {
  skillId?: string;
  skillName?: string;
  isRequired?: boolean;
  importanceLevel?: ImportanceLevel;
  minimumYears?: number;
}

export interface CreateJobNoteDto {
  content: string;
  noteType?: NoteType;
}

export interface ListJobsParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: JobStatus[];
  hiringPriority?: JobPriority[];
  employmentType?: EmploymentType[];
  workMode?: WorkMode[];
  department?: string;
  country?: string;
  hiringManagerId?: string;
  experienceMin?: number;
  experienceMax?: number;
  sortBy?: 'createdAt' | 'title' | 'targetHireDate' | 'hiringPriority';
  sortOrder?: 'asc' | 'desc';
}
