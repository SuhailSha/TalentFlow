import type { ReminderPriority, ReminderStatus } from './reminders';
import type { InterviewStatus, InterviewType } from './interviews';
import type { SubmissionStatus } from './submissions';

export interface CommandCenterMetrics {
  overdueReminders:   { count: number };
  pendingFeedback:    { count: number };
  upcomingInterviews: { count: number; next24h: number };
  stalledSubmissions: { count: number };
  activeJobs:         { count: number };
  activeCandidates:   { count: number };
}

export interface UrgentReminderItem {
  id:           string;
  title:        string;
  dueAt:        string | null;
  priority:     ReminderPriority;
  status:       ReminderStatus;
  candidateId:  string | null;
  submissionId: string | null;
  interviewId:  string | null;
  jobId:        string | null;
}

export interface PendingFeedbackItem {
  id:            string;
  round:         number;
  roundLabel:    string | null;
  completedAt:   string | null;
  status:        InterviewStatus;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  jobReqId:      string;
}

export interface UpcomingInterviewItem {
  id:            string;
  scheduledAt:   string | null;
  status:        InterviewStatus;
  round:         number;
  roundLabel:    string | null;
  type:          InterviewType;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  jobReqId:      string;
}

export interface StalledSubmissionItem {
  id:            string;
  status:        SubmissionStatus;
  updatedAt:     string;
  daysStalled:   number;
  candidateId:   string;
  candidateName: string;
  jobId:         string;
  jobTitle:      string;
  jobReqId:      string;
}

export interface RecruiterWorkloadItem {
  userId:            string;
  name:              string;
  email:             string | null;
  activeSubmissions: number;
}

export interface CommandCenter {
  metrics:               CommandCenterMetrics;
  urgentReminders:       UrgentReminderItem[];
  pendingFeedbackList:   PendingFeedbackItem[];
  upcomingInterviewList: UpcomingInterviewItem[];
  stalledSubmissionList: StalledSubmissionItem[];
  recruiterWorkload:     RecruiterWorkloadItem[];
}
