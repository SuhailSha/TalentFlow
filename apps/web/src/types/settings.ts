// ── Organization types ─────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  logoUrl: string | null;
  status: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSettings {
  id: string;
  organizationId: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  workingDays: number[];
  primaryColor: string | null;
  accentColor: string | null;
  faviconUrl: string | null;
  submissionStaleDays: number;
  workflowStaleDays: number;
  requireInterviewFeedback: boolean;
  emailNotificationsEnabled: boolean;
  inAppNotificationsEnabled: boolean;
  onboardingCompleted: boolean;
  onboardingSteps: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrgProfileDto {
  name?: string;
  slug?: string;
  domain?: string;
  logoUrl?: string;
}

export interface UpdateOrgSettingsDto {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: string;
  workingDays?: number[];
  primaryColor?: string;
  accentColor?: string;
  submissionStaleDays?: number;
  workflowStaleDays?: number;
  requireInterviewFeedback?: boolean;
  emailNotificationsEnabled?: boolean;
  inAppNotificationsEnabled?: boolean;
}

// ── User management types ──────────────────────────────────────────────────────

export type UserStatus = 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export interface UserListItem {
  id: string;
  organizationId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  displayName: string | null;
  avatarUrl: string | null;
  title: string | null;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  userRoles: { role: { id: string; name: string; displayName: string } }[];
}

export interface RecruiterProfileView {
  id: string;
  bio: string | null;
  linkedInUrl: string | null;
  specializations: string[];
  managerId: string | null;
  totalPlacements: number;
  activeCandidates: number;
  activeSubmissions: number;
}

export interface UserDetail extends UserListItem {
  recruiterProfile: RecruiterProfileView | null;
}

export interface InviteUserDto {
  email: string;
  firstName: string;
  lastName: string;
  roleIds?: string[];
}

export interface AssignRolesDto {
  roleIds: string[];
}

export interface ListUsersParams {
  page?: number;
  limit?: number;
  status?: UserStatus;
  search?: string;
}

// ── Invitation types ───────────────────────────────────────────────────────────

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface UserInvitation {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: InvitationStatus;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  invitedBy: { id: string; firstName: string; lastName: string; email: string } | null;
}

// ── Role types ─────────────────────────────────────────────────────────────────

export interface RoleListItem {
  id: string;
  organizationId: string;
  name: string;
  displayName: string;
  description: string | null;
  isSystem: boolean;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRoleDto {
  name: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

export interface UpdateRoleDto {
  name?: string;
  displayName?: string;
  description?: string;
  permissions?: string[];
}

// ── Subscription / Plan types ──────────────────────────────────────────────────

export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';

export interface Plan {
  id: string;
  code: string;
  displayName: string;
  description: string | null;
  maxSeats: number | null;
  maxCandidates: number | null;
  maxActiveJobs: number | null;
  maxVendors: number | null;
  maxMonthlySubmissions: number | null;
  maxMonthlyInterviews: number | null;
  features: string[];
}

export interface Subscription {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  seatLimit: number;
  seatsUsed: number;
  plan: Plan;
}

export interface SeatStats {
  seatLimit: number;
  seatsUsed: number;
  available: number;
}

export type UsageMetric =
  | 'ACTIVE_SEATS'
  | 'TOTAL_CANDIDATES'
  | 'ACTIVE_JOBS'
  | 'ACTIVE_VENDORS'
  | 'MONTHLY_SUBMISSIONS'
  | 'MONTHLY_INTERVIEWS';

export interface UsageRecord {
  id: string;
  metric: UsageMetric;
  value: number;
  period: string;
}

// ── Status labels ──────────────────────────────────────────────────────────────

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  PENDING_VERIFICATION: 'Pending',
  ACTIVE:               'Active',
  SUSPENDED:            'Suspended',
  DEACTIVATED:          'Deactivated',
};

export const INVITATION_STATUS_LABELS: Record<InvitationStatus, string> = {
  PENDING:  'Pending',
  ACCEPTED: 'Accepted',
  EXPIRED:  'Expired',
  REVOKED:  'Revoked',
};

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIALING:  'Trial',
  ACTIVE:    'Active',
  PAST_DUE:  'Past Due',
  CANCELLED: 'Cancelled',
  EXPIRED:   'Expired',
};
