import { Permission, WILDCARD_PERMISSION } from './permissions';

export interface RoleSeed {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

/**
 * System role definitions — seeded once into the `roles` table with
 * isSystem: true and organizationId: null.
 *
 * These roles are available to all tenants. Custom org-level roles
 * (organizationId: <uuid>, isSystem: false) are created via the API.
 *
 * Permission philosophy:
 *   super_admin / org_admin  — wildcard ('*') for future-proof access
 *   All other roles          — explicit, least-privilege permission lists
 */
export const SYSTEM_ROLES: RoleSeed[] = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description:
      'Platform-level administrator. Unrestricted access across all organizations. Assign with extreme caution.',
    permissions: [WILDCARD_PERMISSION],
  },
  {
    name: 'org_admin',
    displayName: 'Organization Admin',
    description: 'Full administrative access within a single organization.',
    permissions: [WILDCARD_PERMISSION],
  },
  {
    name: 'recruiter',
    displayName: 'Recruiter',
    description: 'Manages candidates, job descriptions, and submission pipelines.',
    permissions: [
      Permission.CANDIDATES_READ,
      Permission.CANDIDATES_CREATE,
      Permission.CANDIDATES_UPDATE,
      Permission.JOBS_READ,
      Permission.JOBS_CREATE,
      Permission.JOBS_UPDATE,
      Permission.VENDORS_READ,
      Permission.SUBMISSIONS_READ,
      Permission.SUBMISSIONS_CREATE,
      Permission.SUBMISSIONS_UPDATE,
      Permission.INTERVIEWS_READ,
      Permission.USERS_READ,
      Permission.ROLES_READ,
      Permission.ORG_READ,
    ],
  },
  {
    name: 'hiring_manager',
    displayName: 'Hiring Manager',
    description: 'Reviews candidates, provides feedback, and approves/rejects submissions.',
    permissions: [
      Permission.CANDIDATES_READ,
      Permission.JOBS_READ,
      Permission.SUBMISSIONS_READ,
      Permission.SUBMISSIONS_UPDATE,
      Permission.INTERVIEWS_READ,
      Permission.INTERVIEWS_CREATE,
      Permission.INTERVIEWS_UPDATE,
      Permission.USERS_READ,
      Permission.ORG_READ,
    ],
  },
  {
    name: 'vendor_manager',
    displayName: 'Vendor Manager',
    description: 'Manages vendor relationships and reviews vendor-submitted candidates.',
    permissions: [
      Permission.VENDORS_READ,
      Permission.VENDORS_CREATE,
      Permission.VENDORS_UPDATE,
      Permission.SUBMISSIONS_READ,
      Permission.CANDIDATES_READ,
      Permission.JOBS_READ,
      Permission.ORG_READ,
    ],
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access across candidates, jobs, vendors, and submissions.',
    permissions: [
      Permission.CANDIDATES_READ,
      Permission.JOBS_READ,
      Permission.VENDORS_READ,
      Permission.SUBMISSIONS_READ,
      Permission.ORG_READ,
    ],
  },
];
