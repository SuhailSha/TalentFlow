export type CandidateStatus = 'ACTIVE' | 'INACTIVE' | 'AVAILABLE' | 'PLACED' | 'BLACKLISTED';
export type AvailabilityStatus =
  | 'IMMEDIATELY'
  | 'TWO_WEEKS'
  | 'ONE_MONTH'
  | 'THREE_MONTHS'
  | 'NOT_LOOKING';
export type CandidateSource = 'MANUAL' | 'IMPORT' | 'VENDOR' | 'JOB_BOARD' | 'REFERRAL';
export type ProficiencyLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type NoteType = 'NOTE' | 'CALL' | 'EMAIL' | 'MEETING' | 'STATUS_CHANGE' | 'SYSTEM';
export type SkillCategory =
  | 'PROGRAMMING_LANGUAGE'
  | 'FRAMEWORK_LIBRARY'
  | 'DATABASE'
  | 'CLOUD_INFRASTRUCTURE'
  | 'DEVOPS'
  | 'DESIGN'
  | 'PROJECT_MANAGEMENT'
  | 'SOFT_SKILL'
  | 'DOMAIN_EXPERTISE'
  | 'OTHER';

export interface Skill {
  id: string;
  name: string;
  displayName: string;
  category: SkillCategory;
}

export interface CandidateSkillView {
  id: string;
  skill: Skill;
  proficiencyLevel: ProficiencyLevel;
  yearsOfExperience: number | null;
  isPrimary: boolean;
}

export interface CandidateNoteView {
  id: string;
  content: string;
  noteType: NoteType;
  authorId: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
}

export interface CandidateListItem {
  id: string;
  organizationId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  experienceYears: number | null;
  isRemote: boolean;
  status: CandidateStatus;
  availabilityStatus: AvailabilityStatus;
  availableFrom: string | null;
  source: CandidateSource;
  topSkills: CandidateSkillView[];
  lastActivityAt: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  careerStartDate: string | null;
  resumeFileName: string | null;
  resumeUploadedAt: string | null;
  allSkills: CandidateSkillView[];
  notes: CandidateNoteView[];
  sourceDetail: string | null;
  relationshipOwnerId: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface PotentialDuplicate {
  id: string;
  fullName: string;
  email: string;
  currentTitle: string | null;
}

export interface CreateCandidateDto {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  city?: string;
  stateProvince?: string;
  country?: string;
  timezone?: string;
  isRemote?: boolean;
  currentTitle?: string;
  currentCompany?: string;
  careerStartDate?: string;
  summary?: string;
  salaryExpectationMin?: number;
  salaryExpectationMax?: number;
  salaryCurrency?: string;
  status?: CandidateStatus;
  availabilityStatus?: AvailabilityStatus;
  availableFrom?: string;
  source?: CandidateSource;
  sourceDetail?: string;
}

export type UpdateCandidateDto = Partial<CreateCandidateDto>;

export interface AssignSkillDto {
  skillId?: string;
  skillName?: string;
  proficiencyLevel?: ProficiencyLevel;
  yearsOfExperience?: number;
  isPrimary?: boolean;
}

export interface CreateNoteDto {
  content: string;
  noteType?: NoteType;
}

export interface ListCandidatesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CandidateStatus[];
  availabilityStatus?: AvailabilityStatus[];
  skillIds?: string[];
  experienceMin?: number;
  experienceMax?: number;
  country?: string;
  isRemote?: boolean;
  sortBy?: 'createdAt' | 'name' | 'lastActivity' | 'experience';
  sortOrder?: 'asc' | 'desc';
}
