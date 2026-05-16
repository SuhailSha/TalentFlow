import type { InterviewStatus } from './interviews';
import type { ReminderPriority, ReminderStatus } from './reminders';
import type { SubmissionStatus } from './submissions';
import type { VendorDetail } from './vendors';

export interface VendorMetrics {
  totalSubmissions:        number;
  activeSubmissions:       number;
  placements:              { allTime: number; thisMonth: number };
  activeInterviews:        number;
  feedbackPendingCount:    number;
  openReminders:           number;
  stalledSubmissions:      number;
  lastSubmissionAt:        string | null;
  daysSinceLastSubmission: number | null;
}

export interface VendorPipelineSummary {
  [stage: string]: number;
}

export interface VendorActiveSubmission {
  id:          string;
  status:      SubmissionStatus;
  candidate:   { id: string; firstName: string; lastName: string; email: string };
  job:         { id: string; reqId: string; title: string };
  owner:       { id: string; firstName: string; lastName: string };
  submittedAt: string | null;
  updatedAt:   string;
  daysStalled: number;
}

export interface VendorUpcomingInterview {
  id:          string;
  scheduledAt: string | null;
  status:      InterviewStatus;
  round:       number;
  candidate:   { id: string; firstName: string; lastName: string };
  job:         { id: string; reqId: string; title: string };
}

export interface VendorOpenReminder {
  id:           string;
  title:        string;
  description:  string | null;
  dueAt:        string | null;
  priority:     ReminderPriority;
  status:       ReminderStatus;
  submissionId: string | null;
  interviewId:  string | null;
}

export interface VendorRecruiter {
  userId:      string;
  name:        string;
  email:       string;
  activeCount: number;
}

export interface VendorHealthSignals {
  isStalled:           boolean;
  isInactive:          boolean;
  noRecentSubmissions: boolean;
  hasOverdueReminders: boolean;
  hasPendingFeedback:  boolean;
}

export interface VendorWorkspace {
  vendor:             VendorDetail;
  metrics:            VendorMetrics;
  pipeline:           VendorPipelineSummary;
  activeSubmissions:  VendorActiveSubmission[];
  upcomingInterviews: VendorUpcomingInterview[];
  openReminders:      VendorOpenReminder[];
  topRecruiters:      VendorRecruiter[];
  health:             VendorHealthSignals;
}
