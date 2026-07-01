/**
 * @repo/database — central Prisma client and type exports.
 *
 * Consumers:
 *   NestJS API  — import { PrismaClient } from '@repo/database';
 *                 PrismaService extends PrismaClient (lifecycle managed by NestJS)
 *
 *   Next.js app — import { db } from '@repo/database';
 *                 Singleton via globalThis pattern (avoids hot-reload exhaustion)
 *
 *   Shared code — import type { Organization, User, ... } from '@repo/database';
 *                 All generated Prisma model types re-exported for type safety
 */

// ── PrismaClient class ────────────────────────────────────────────────────────
// Re-exported so NestJS can extend it without adding @prisma/client as a
// direct dependency of apps/api.
export { PrismaClient, Prisma } from '@prisma/client';

// ── Singleton for stateless environments (Next.js, scripts) ──────────────────
export { db } from './client';

// ── Generated model types ─────────────────────────────────────────────────────
// All Prisma-generated TypeScript types: model shapes, input types, enums, etc.
// Consumers can import the exact types they need:
//   import type { Organization, User, UserStatus } from '@repo/database';
// Model types (type-only — no runtime value needed)
export type {
  Organization,
  User,
  Role,
  UserRole,
  AuditLog,
  RefreshToken,
  Candidate,
  Skill,
  CandidateSkill,
  CandidateNote,
  // Job Description domain
  JobDescription,
  JobSkill,
  JobNote,
  // Vendor domain
  Vendor,
  VendorContact,
  VendorNote,
  // Submission domain
  Submission,
  SubmissionNote,
  SubmissionStatusHistory,
  // Interview domain
  Interview,
  InterviewFeedback,
  InterviewNote,
  InterviewStatusHistory,
  InterviewParticipant,
  // Reminder/Notification domain
  Reminder,
  ReminderActivity,
  Notification,
  // Org-mgmt domain
  UserInvitation,
  OrganizationSettings,
  Plan,
  Subscription,
  UsageRecord,
  RecruiterProfile,
  // Communication domain
  EmailDelivery,
  // Resume Intelligence domain (Phase C — R1)
  Resume,
  ResumeVersion,
  ResumeIntakeBatch,
  ResumeAccessLog,
  OrganizationExtractionConfig,
  // Resume Parsing pipeline (Phase C — R2)
  ParsingJob,
  ExtractionResult,
  // Resume Review queue (Phase C — R3)
  ReviewTask,
  // Duplicate detection (Phase C — R4)
  DuplicateDetectionRun,
  DuplicateCandidateMatch,
} from '@prisma/client';

// Enum values — exported as values so @IsEnum() decorators can use them at runtime.
// Also implicitly exports the TypeScript type alias for each enum.
export {
  OrgStatus,
  OrgPlan,
  UserStatus,
  CandidateStatus,
  AvailabilityStatus,
  CandidateSource,
  SkillCategory,
  ProficiencyLevel,
  NoteType,
  // Job Description domain
  JobStatus,
  JobPriority,
  EmploymentType,
  WorkMode,
  SalaryType,
  ImportanceLevel,
  // Vendor domain
  VendorStatus,
  VendorPriority,
  VendorType,
  // Submission domain
  SubmissionStatus,
  // Interview domain
  InterviewStatus,
  InterviewType,
  FeedbackRecommendation,
  InterviewParticipantRole,
  // Reminder/Notification domain
  ReminderType,
  ReminderStatus,
  ReminderPriority,
  ReminderActivityAction,
  NotificationChannel,
  NotificationStatus,
  // Org-mgmt domain
  InvitationStatus,
  SubscriptionStatus,
  UsageMetric,
  // Communication domain
  EmailDeliveryStatus,
  // Resume Intelligence domain (Phase C — R1)
  ResumeSource,
  ResumeStatus,
  ResumeIntakeBatchStatus,
  ResumeAccessAction,
  ResumeParserProvider,
  // Resume AV scan (Phase C — R1, TF-1-16)
  ResumeScanStatus,
  // Resume Parsing pipeline (Phase C — R2)
  ParsingJobStatus,
  // Resume Review queue (Phase C — R3)
  ReviewTaskStatus,
  ReviewPriority,
  // Duplicate detection (Phase C — R4)
  DuplicateRunStatus,
  DuplicateRunTrigger,
  DuplicateConfidenceTier,
  DuplicateMatchStatus,
} from '@prisma/client';
