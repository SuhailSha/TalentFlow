/**
 * Database seed — idempotent system roles + dev demo data.
 *
 * Run:   pnpm --filter @repo/database db:seed
 * Safe:  every block uses findFirst + create/update — re-running is always safe.
 *
 * What this seeds:
 *   1. System roles (6 platform roles)
 *   2. Demo organization  — "Acme Staffing" (slug: acme)
 *   3. Demo users         — admin, recruiter, viewer (password: Demo1234!)
 *   4. Skills catalogue   — 20 common tech skills
 *   5. Demo candidates    — 12 realistic candidates with skills + notes
 */

import {
  PrismaClient, OrgPlan, SkillCategory, NoteType, CandidateSource,
  VendorStatus, VendorPriority, VendorType,
  JobStatus, JobPriority, EmploymentType, WorkMode,
  SubmissionStatus,
  InterviewStatus, InterviewType,
  ReminderType, ReminderPriority, ReminderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

// ── Time helpers ──────────────────────────────────────────────────────────────
// Operational seed data uses these to age records into "fresh" / "stalled"
// buckets so the workspace health signals exercise meaningfully.

const HOUR = 60 * 60 * 1000;
const DAY  = 24 * HOUR;
const daysAgo  = (n: number) => new Date(Date.now() - n * DAY);
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY);
const hoursFromNow = (n: number) => new Date(Date.now() + n * HOUR);

const prisma = new PrismaClient();

const WILDCARD = '*';
const BCRYPT_ROUNDS = 12;
const DEMO_PASSWORD = 'Demo1234!';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function log(icon: string, label: string, detail?: string): void {
  const suffix = detail ? `  (${detail})` : '';
  console.log(`  ${icon}  ${label}${suffix}`);
}

// ── 1. System roles ───────────────────────────────────────────────────────────

interface RoleSeed {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
}

const SYSTEM_ROLES: RoleSeed[] = [
  {
    name: 'super_admin',
    displayName: 'Super Admin',
    description: 'Platform-level administrator. Unrestricted access across all organizations.',
    permissions: [WILDCARD],
  },
  {
    name: 'org_admin',
    displayName: 'Organization Admin',
    description: 'Full administrative access within a single organization.',
    permissions: [WILDCARD],
  },
  {
    name: 'recruiter',
    displayName: 'Recruiter',
    description: 'Manages candidates, job descriptions, and submission pipelines.',
    permissions: [
      'candidates:read', 'candidates:create', 'candidates:update',
      'jobs:read', 'jobs:create', 'jobs:update',
      'vendors:read',
      'submissions:read', 'submissions:create', 'submissions:update',
      'interviews:read',
      'resumes:read', 'resumes:create', 'resumes:update', 'resumes:download',
      'extraction_config:read',
      'users:read', 'roles:read', 'org:read',
    ],
  },
  {
    name: 'hiring_manager',
    displayName: 'Hiring Manager',
    description: 'Reviews candidates and approves or rejects submissions.',
    permissions: [
      'candidates:read',
      'jobs:read',
      'submissions:read', 'submissions:update',
      'interviews:read', 'interviews:create', 'interviews:update',
      'users:read', 'org:read',
    ],
  },
  {
    name: 'vendor_manager',
    displayName: 'Vendor Manager',
    description: 'Manages vendor relationships and reviews vendor-submitted candidates.',
    permissions: [
      'vendors:read', 'vendors:create', 'vendors:update',
      'submissions:read',
      'candidates:read',
      'jobs:read',
      'org:read',
    ],
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access across candidates, jobs, vendors, and submissions.',
    permissions: [
      'candidates:read', 'jobs:read', 'vendors:read',
      'submissions:read', 'org:read',
      'resumes:read', 'resumes:download',
      'extraction_config:read',
    ],
  },
];

async function seedRoles(): Promise<Map<string, string>> {
  console.log('\n🔐  System roles\n');
  const roleIds = new Map<string, string>();

  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, organizationId: null, isSystem: true },
    });

    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { displayName: role.displayName, description: role.description, permissions: role.permissions },
      });
      log('↻', role.name, 'updated');
      roleIds.set(role.name, existing.id);
    } else {
      const created = await prisma.role.create({
        data: {
          name: role.name,
          displayName: role.displayName,
          description: role.description,
          permissions: role.permissions,
          isSystem: true,
          organizationId: null,
        },
      });
      log('+', role.name, `${role.permissions.length} permissions`);
      roleIds.set(role.name, created.id);
    }
  }

  return roleIds;
}

// ── 2. Plans ──────────────────────────────────────────────────────────────────

interface PlanSeed {
  code: OrgPlan;
  displayName: string;
  description: string;
  maxSeats: number;
  maxCandidates: number;
  maxActiveJobs: number;
  maxVendors: number;
  maxMonthlySubmissions: number;
  maxMonthlyInterviews: number;
  features: string[];
}

const PLAN_SEEDS: PlanSeed[] = [
  {
    code: 'STARTER',
    displayName: 'Starter',
    description: 'For small teams just getting started with recruitment.',
    maxSeats: 3,
    maxCandidates: 200,
    maxActiveJobs: 5,
    maxVendors: 10,
    maxMonthlySubmissions: 50,
    maxMonthlyInterviews: 30,
    features: ['basic_reporting', 'email_support'],
  },
  {
    code: 'PROFESSIONAL',
    displayName: 'Professional',
    description: 'For growing recruitment teams with active pipelines.',
    maxSeats: 15,
    maxCandidates: 2000,
    maxActiveJobs: 50,
    maxVendors: 100,
    maxMonthlySubmissions: 500,
    maxMonthlyInterviews: 300,
    features: ['custom_roles', 'analytics', 'api_access', 'priority_support', 'basic_reporting'],
  },
  {
    code: 'ENTERPRISE',
    displayName: 'Enterprise',
    description: 'Unlimited scale for large recruitment operations.',
    maxSeats: -1,
    maxCandidates: -1,
    maxActiveJobs: -1,
    maxVendors: -1,
    maxMonthlySubmissions: -1,
    maxMonthlyInterviews: -1,
    features: ['custom_roles', 'analytics', 'api_access', 'dedicated_support', 'sso', 'audit_export', 'basic_reporting'],
  },
];

async function seedPlans(): Promise<Map<OrgPlan, string>> {
  console.log('\n📋  Plans\n');
  const planIds = new Map<OrgPlan, string>();

  for (const p of PLAN_SEEDS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        displayName: p.displayName,
        description: p.description,
        maxSeats: p.maxSeats,
        maxCandidates: p.maxCandidates,
        maxActiveJobs: p.maxActiveJobs,
        maxVendors: p.maxVendors,
        maxMonthlySubmissions: p.maxMonthlySubmissions,
        maxMonthlyInterviews: p.maxMonthlyInterviews,
        features: p.features,
      },
      create: {
        code: p.code,
        displayName: p.displayName,
        description: p.description,
        maxSeats: p.maxSeats,
        maxCandidates: p.maxCandidates,
        maxActiveJobs: p.maxActiveJobs,
        maxVendors: p.maxVendors,
        maxMonthlySubmissions: p.maxMonthlySubmissions,
        maxMonthlyInterviews: p.maxMonthlyInterviews,
        features: p.features,
      },
    });
    planIds.set(p.code, plan.id);
    log('+', p.displayName, `${p.maxSeats === -1 ? 'unlimited' : p.maxSeats} seats`);
  }

  return planIds;
}

// ── 3. Demo organisation ──────────────────────────────────────────────────────

async function seedOrg(): Promise<string> {
  console.log('\n🏢  Demo organization\n');

  const existing = await prisma.organization.findUnique({ where: { slug: 'acme' } });

  if (existing) {
    log('↻', 'acme', 'already exists');
    return existing.id;
  }

  const org = await prisma.organization.create({
    data: {
      name: 'Acme Staffing',
      slug: 'acme',
      domain: 'acme-demo.com',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      settings: {},
    },
  });

  log('+', 'Acme Staffing', `id: ${org.id}`);
  return org.id;
}

// ── 3. Demo users ─────────────────────────────────────────────────────────────

interface UserSeed {
  email: string;
  firstName: string;
  lastName: string;
  title: string;
  roleName: string;
}

const DEMO_USERS: UserSeed[] = [
  {
    email: 'admin@acme-demo.com',
    firstName: 'Alice',
    lastName: 'Admin',
    title: 'Platform Administrator',
    roleName: 'org_admin',
  },
  {
    email: 'recruiter@acme-demo.com',
    firstName: 'Bob',
    lastName: 'Recruiter',
    title: 'Senior Recruiter',
    roleName: 'recruiter',
  },
  {
    email: 'viewer@acme-demo.com',
    firstName: 'Carol',
    lastName: 'Viewer',
    title: 'Hiring Manager',
    roleName: 'viewer',
  },
];

async function seedUsers(
  orgId: string,
  roleIds: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('\n👥  Demo users  (password: Demo1234!)\n');
  const userIds = new Map<string, string>();
  const passwordHash = await hash(DEMO_PASSWORD);

  for (const u of DEMO_USERS) {
    const existing = await prisma.user.findFirst({
      where: { email: u.email, organizationId: orgId },
    });

    let userId: string;

    if (existing) {
      log('↻', u.email, 'already exists');
      userId = existing.id;
    } else {
      const user = await prisma.user.create({
        data: {
          organizationId: orgId,
          email: u.email,
          passwordHash,
          firstName: u.firstName,
          lastName: u.lastName,
          displayName: `${u.firstName} ${u.lastName}`,
          title: u.title,
          status: 'ACTIVE',
          emailVerified: true,
        },
      });
      log('+', u.email, `${u.firstName} ${u.lastName} / ${u.roleName}`);
      userId = user.id;
    }

    userIds.set(u.email, userId);

    // Assign role if not already assigned
    const roleId = roleIds.get(u.roleName);
    if (roleId) {
      const existingGrant = await prisma.userRole.findFirst({
        where: { userId, roleId },
      });
      if (!existingGrant) {
        await prisma.userRole.create({
          data: { userId, roleId, organizationId: orgId },
        });
      }
    }
  }

  return userIds;
}

// ── 4. Skills catalogue ───────────────────────────────────────────────────────

interface SkillSeed {
  name: string;
  displayName: string;
  category: SkillCategory;
}

const DEMO_SKILLS: SkillSeed[] = [
  // Programming languages
  { name: 'typescript', displayName: 'TypeScript', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'javascript', displayName: 'JavaScript', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'python', displayName: 'Python', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'java', displayName: 'Java', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'go', displayName: 'Go', category: 'PROGRAMMING_LANGUAGE' },
  { name: 'rust', displayName: 'Rust', category: 'PROGRAMMING_LANGUAGE' },
  // Frameworks/Libraries
  { name: 'react', displayName: 'React', category: 'FRAMEWORK_LIBRARY' },
  { name: 'next.js', displayName: 'Next.js', category: 'FRAMEWORK_LIBRARY' },
  { name: 'node.js', displayName: 'Node.js', category: 'FRAMEWORK_LIBRARY' },
  { name: 'nestjs', displayName: 'NestJS', category: 'FRAMEWORK_LIBRARY' },
  { name: 'vue.js', displayName: 'Vue.js', category: 'FRAMEWORK_LIBRARY' },
  { name: 'django', displayName: 'Django', category: 'FRAMEWORK_LIBRARY' },
  { name: 'fastapi', displayName: 'FastAPI', category: 'FRAMEWORK_LIBRARY' },
  // Databases
  { name: 'postgresql', displayName: 'PostgreSQL', category: 'DATABASE' },
  { name: 'redis', displayName: 'Redis', category: 'DATABASE' },
  { name: 'mongodb', displayName: 'MongoDB', category: 'DATABASE' },
  // Cloud / DevOps
  { name: 'aws', displayName: 'AWS', category: 'CLOUD_INFRASTRUCTURE' },
  { name: 'docker', displayName: 'Docker', category: 'DEVOPS' },
  { name: 'kubernetes', displayName: 'Kubernetes', category: 'DEVOPS' },
  // Design
  { name: 'figma', displayName: 'Figma', category: 'DESIGN' },
];

async function seedSkills(): Promise<Map<string, string>> {
  console.log('\n🛠   Skills catalogue\n');
  const skillIds = new Map<string, string>();

  for (const s of DEMO_SKILLS) {
    const skill = await prisma.skill.upsert({
      where: { name: s.name },
      update: { displayName: s.displayName, category: s.category },
      create: { name: s.name, displayName: s.displayName, category: s.category },
    });
    skillIds.set(s.name, skill.id);
  }

  log('+', `${DEMO_SKILLS.length} skills`, 'upserted');
  return skillIds;
}

// ── 5. Demo candidates ────────────────────────────────────────────────────────

interface CandidateSeed {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  city?: string;
  country?: string;
  isRemote: boolean;
  currentTitle?: string;
  currentCompany?: string;
  careerStartYear?: number; // used to compute careerStartDate
  summary?: string;
  salaryMin?: number;
  salaryMax?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'PLACED';
  availability: 'IMMEDIATELY' | 'TWO_WEEKS' | 'ONE_MONTH' | 'THREE_MONTHS' | 'NOT_LOOKING';
  source: CandidateSource;
  linkedinUrl?: string;
  skills: Array<{ name: string; primary?: boolean; level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT'; years?: number }>;
  notes?: Array<{ content: string; type: NoteType }>;
}

const DEMO_CANDIDATES: CandidateSeed[] = [
  {
    email: 'sarah.chen@email.com',
    firstName: 'Sarah',
    lastName: 'Chen',
    phone: '+1-415-555-0101',
    city: 'San Francisco',
    country: 'United States',
    isRemote: true,
    currentTitle: 'Senior Full-Stack Engineer',
    currentCompany: 'TechFlow Inc.',
    careerStartYear: 2015,
    summary: 'Seasoned full-stack engineer with deep expertise in React/TypeScript and Node.js. Led migration of monolith to microservices at TechFlow, reducing API latency by 40%. Open to remote-first senior/staff roles.',
    salaryMin: 160000,
    salaryMax: 200000,
    status: 'ACTIVE',
    availability: 'ONE_MONTH',
    source: 'MANUAL',
    linkedinUrl: 'https://linkedin.com/in/sarah-chen-demo',
    skills: [
      { name: 'typescript', primary: true, level: 'EXPERT', years: 6 },
      { name: 'react', primary: true, level: 'EXPERT', years: 7 },
      { name: 'node.js', primary: false, level: 'ADVANCED', years: 7 },
      { name: 'postgresql', primary: false, level: 'ADVANCED', years: 5 },
      { name: 'docker', primary: false, level: 'INTERMEDIATE', years: 3 },
    ],
    notes: [
      { content: 'Initial call went well. Sarah is highly motivated and would be a strong fit for senior-level roles. Follow up with technical assessment this week.', type: 'CALL' },
      { content: 'Sent over two JD drafts. She is most interested in the Staff Engineer role at CloudBridge.', type: 'EMAIL' },
    ],
  },
  {
    email: 'marcus.okafor@email.com',
    firstName: 'Marcus',
    lastName: 'Okafor',
    phone: '+44-20-7946-0958',
    city: 'London',
    country: 'United Kingdom',
    isRemote: false,
    currentTitle: 'Backend Engineer',
    currentCompany: 'Fintech Ltd.',
    careerStartYear: 2019,
    summary: 'Backend engineer specialising in high-throughput financial systems. Strong Go and Python background. Built real-time payment processing pipeline handling 50k tx/s.',
    salaryMin: 80000,
    salaryMax: 110000,
    status: 'ACTIVE',
    availability: 'TWO_WEEKS',
    source: 'REFERRAL',
    skills: [
      { name: 'go', primary: true, level: 'EXPERT', years: 4 },
      { name: 'python', primary: true, level: 'ADVANCED', years: 5 },
      { name: 'postgresql', primary: false, level: 'ADVANCED', years: 4 },
      { name: 'redis', primary: false, level: 'INTERMEDIATE', years: 3 },
      { name: 'kubernetes', primary: false, level: 'INTERMEDIATE', years: 2 },
    ],
    notes: [
      { content: 'Referred by James Walker (current client). Strong technical profile — schedule a video screen next week.', type: 'NOTE' },
    ],
  },
  {
    email: 'priya.sharma@email.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    phone: '+91-98765-43210',
    city: 'Bangalore',
    country: 'India',
    isRemote: true,
    currentTitle: 'Data Engineer',
    currentCompany: 'DataBricks Corp',
    careerStartYear: 2018,
    summary: 'Data engineer with strong Python and SQL skills. Designed and maintained ETL pipelines processing 500GB+ daily. Experience with AWS Glue, Redshift, and Spark.',
    salaryMin: 40000,
    salaryMax: 60000,
    status: 'ACTIVE',
    availability: 'IMMEDIATELY',
    source: 'JOB_BOARD',
    skills: [
      { name: 'python', primary: true, level: 'EXPERT', years: 6 },
      { name: 'postgresql', primary: true, level: 'ADVANCED', years: 5 },
      { name: 'aws', primary: false, level: 'ADVANCED', years: 4 },
      { name: 'docker', primary: false, level: 'INTERMEDIATE', years: 3 },
    ],
    notes: [
      { content: 'Applied via LinkedIn. Available immediately. Strong CV — prioritise scheduling a call.', type: 'NOTE' },
    ],
  },
  {
    email: 'david.kowalski@email.com',
    firstName: 'David',
    lastName: 'Kowalski',
    phone: '+48-22-555-0199',
    city: 'Warsaw',
    country: 'Poland',
    isRemote: true,
    currentTitle: 'Frontend Developer',
    currentCompany: 'MediaHouse',
    careerStartYear: 2020,
    summary: 'Frontend specialist focused on React and Next.js. Built and maintained consumer-facing UI for 2M+ MAU news platform. Strong on performance optimisation and accessibility.',
    salaryMin: 55000,
    salaryMax: 75000,
    status: 'ACTIVE',
    availability: 'ONE_MONTH',
    source: 'MANUAL',
    skills: [
      { name: 'react', primary: true, level: 'ADVANCED', years: 4 },
      { name: 'next.js', primary: true, level: 'ADVANCED', years: 3 },
      { name: 'typescript', primary: false, level: 'ADVANCED', years: 3 },
      { name: 'figma', primary: false, level: 'INTERMEDIATE', years: 2 },
    ],
  },
  {
    email: 'nina.vasquez@email.com',
    firstName: 'Nina',
    lastName: 'Vasquez',
    phone: '+34-91-555-0177',
    city: 'Barcelona',
    country: 'Spain',
    isRemote: true,
    currentTitle: 'Staff Engineer',
    currentCompany: 'ScaleAI',
    careerStartYear: 2012,
    summary: 'Staff engineer with 12 years of experience across startups and scale-ups. Led three platform migrations and built two engineering teams from scratch. Focused on distributed systems.',
    salaryMin: 140000,
    salaryMax: 180000,
    status: 'ACTIVE',
    availability: 'THREE_MONTHS',
    source: 'MANUAL',
    linkedinUrl: 'https://linkedin.com/in/nina-vasquez-demo',
    skills: [
      { name: 'java', primary: true, level: 'EXPERT', years: 12 },
      { name: 'kubernetes', primary: true, level: 'EXPERT', years: 6 },
      { name: 'aws', primary: false, level: 'EXPERT', years: 8 },
      { name: 'postgresql', primary: false, level: 'ADVANCED', years: 8 },
      { name: 'docker', primary: false, level: 'EXPERT', years: 6 },
    ],
    notes: [
      { content: 'Nina is only looking at director-level or very senior staff roles. Compensation needs to include equity. Noted for upcoming Director of Engineering search.', type: 'NOTE' },
      { content: 'Follow-up meeting booked for next quarter when she finishes her current project.', type: 'MEETING' },
    ],
  },
  {
    email: 'james.oconnor@email.com',
    firstName: 'James',
    lastName: "O'Connor",
    phone: '+353-1-555-0122',
    city: 'Dublin',
    country: 'Ireland',
    isRemote: false,
    currentTitle: 'DevOps Engineer',
    currentCompany: 'CloudNative Ltd.',
    careerStartYear: 2017,
    summary: 'DevOps engineer specialising in Kubernetes and CI/CD pipelines. Reduced deployment time from 45 to 8 minutes at current employer. AWS certified, strong IaC experience with Terraform.',
    salaryMin: 90000,
    salaryMax: 120000,
    status: 'ACTIVE',
    availability: 'TWO_WEEKS',
    source: 'MANUAL',
    skills: [
      { name: 'kubernetes', primary: true, level: 'EXPERT', years: 5 },
      { name: 'docker', primary: true, level: 'EXPERT', years: 6 },
      { name: 'aws', primary: false, level: 'ADVANCED', years: 5 },
      { name: 'python', primary: false, level: 'INTERMEDIATE', years: 4 },
    ],
  },
  {
    email: 'aisha.diallo@email.com',
    firstName: 'Aisha',
    lastName: 'Diallo',
    phone: '+33-1-55-55-01-23',
    city: 'Paris',
    country: 'France',
    isRemote: true,
    currentTitle: 'Full-Stack Developer',
    currentCompany: 'Freelance',
    careerStartYear: 2021,
    summary: 'Junior full-stack developer with 3 years of experience building SaaS products. Worked on a Vue.js + Django e-commerce platform serving 50k users. Looking to join a product-led company.',
    salaryMin: 45000,
    salaryMax: 60000,
    status: 'ACTIVE',
    availability: 'IMMEDIATELY',
    source: 'REFERRAL',
    skills: [
      { name: 'vue.js', primary: true, level: 'INTERMEDIATE', years: 3 },
      { name: 'django', primary: true, level: 'INTERMEDIATE', years: 3 },
      { name: 'python', primary: false, level: 'INTERMEDIATE', years: 3 },
      { name: 'postgresql', primary: false, level: 'BEGINNER', years: 2 },
    ],
  },
  {
    email: 'ryan.park@email.com',
    firstName: 'Ryan',
    lastName: 'Park',
    phone: '+82-2-555-0155',
    city: 'Seoul',
    country: 'South Korea',
    isRemote: true,
    currentTitle: 'Senior Backend Engineer',
    currentCompany: 'Kakao',
    careerStartYear: 2016,
    summary: 'Backend engineer with 8 years of experience in Java and Go microservices. Built real-time notifications system at Kakao handling 10M+ daily active users. Open to relocation.',
    salaryMin: 120000,
    salaryMax: 160000,
    status: 'ACTIVE',
    availability: 'ONE_MONTH',
    source: 'MANUAL',
    skills: [
      { name: 'java', primary: true, level: 'EXPERT', years: 8 },
      { name: 'go', primary: true, level: 'ADVANCED', years: 4 },
      { name: 'redis', primary: false, level: 'ADVANCED', years: 5 },
      { name: 'kubernetes', primary: false, level: 'INTERMEDIATE', years: 3 },
    ],
  },
  {
    email: 'emma.lindqvist@email.com',
    firstName: 'Emma',
    lastName: 'Lindqvist',
    city: 'Stockholm',
    country: 'Sweden',
    isRemote: false,
    currentTitle: 'UX/Product Designer',
    currentCompany: 'Spotify',
    careerStartYear: 2018,
    summary: 'Product designer with 6 years of experience across B2B SaaS and consumer apps. Led end-to-end redesign of Spotify\'s podcast discovery UI that increased session time by 22%. Strong in design systems.',
    salaryMin: 95000,
    salaryMax: 130000,
    status: 'ACTIVE',
    availability: 'THREE_MONTHS',
    source: 'MANUAL',
    linkedinUrl: 'https://linkedin.com/in/emma-lindqvist-demo',
    skills: [
      { name: 'figma', primary: true, level: 'EXPERT', years: 6 },
    ],
    notes: [
      { content: 'Passive candidate. Only interested if a very strong product design lead or head role comes up. Keep warm.', type: 'NOTE' },
    ],
  },
  {
    email: 'tom.harris@email.com',
    firstName: 'Tom',
    lastName: 'Harris',
    phone: '+1-212-555-0188',
    city: 'New York',
    country: 'United States',
    isRemote: false,
    currentTitle: 'Engineering Manager',
    currentCompany: 'Stripe',
    careerStartYear: 2013,
    summary: 'Engineering manager with 11 years of experience. Currently leads a team of 12 engineers at Stripe. Strong background in distributed systems (Rust, Go) before moving to management. Seeking EM or Director opportunities.',
    salaryMin: 200000,
    salaryMax: 260000,
    status: 'ACTIVE',
    availability: 'THREE_MONTHS',
    source: 'REFERRAL',
    skills: [
      { name: 'rust', primary: true, level: 'ADVANCED', years: 5 },
      { name: 'go', primary: false, level: 'ADVANCED', years: 6 },
      { name: 'postgresql', primary: false, level: 'INTERMEDIATE', years: 6 },
    ],
    notes: [
      { content: 'High-value candidate. Handle with care — referred by our contact at Stripe. Only reach out for Director+ roles with strong compensation.', type: 'NOTE' },
      { content: 'Brief intro call. Tom is very selective — currently only exploring, not active. Will reach out in Q2.', type: 'CALL' },
    ],
  },
  {
    email: 'fatima.al-rashid@email.com',
    firstName: 'Fatima',
    lastName: 'Al-Rashid',
    phone: '+971-4-555-0166',
    city: 'Dubai',
    country: 'United Arab Emirates',
    isRemote: true,
    currentTitle: 'Senior Software Engineer',
    currentCompany: 'Careem',
    careerStartYear: 2017,
    summary: 'Senior engineer with strong TypeScript and React Native background. Built Careem\'s driver app (6M+ users). Experienced in mobile + web convergence. Open to fully remote European roles.',
    salaryMin: 85000,
    salaryMax: 115000,
    status: 'ACTIVE',
    availability: 'TWO_WEEKS',
    source: 'JOB_BOARD',
    skills: [
      { name: 'typescript', primary: true, level: 'EXPERT', years: 6 },
      { name: 'react', primary: true, level: 'ADVANCED', years: 5 },
      { name: 'node.js', primary: false, level: 'INTERMEDIATE', years: 4 },
      { name: 'postgresql', primary: false, level: 'INTERMEDIATE', years: 4 },
    ],
  },
  {
    email: 'alex.chen@email.com',
    firstName: 'Alex',
    lastName: 'Chen',
    phone: '+1-650-555-0144',
    city: 'San Jose',
    country: 'United States',
    isRemote: true,
    currentTitle: 'Principal Engineer',
    currentCompany: 'Google',
    careerStartYear: 2010,
    summary: 'Principal engineer at Google, working on infrastructure reliability. 14 years of experience. Deep expertise in distributed systems, SRE, and large-scale Go/Python services. Currently exploring opportunities outside FAANG.',
    salaryMin: 280000,
    salaryMax: 380000,
    status: 'PLACED',
    availability: 'NOT_LOOKING',
    source: 'MANUAL',
    skills: [
      { name: 'go', primary: true, level: 'EXPERT', years: 10 },
      { name: 'python', primary: false, level: 'EXPERT', years: 12 },
      { name: 'kubernetes', primary: false, level: 'EXPERT', years: 7 },
      { name: 'aws', primary: false, level: 'ADVANCED', years: 6 },
    ],
    notes: [
      { content: 'Successfully placed at CloudBridge as VP of Engineering. Placement closed March 2024.', type: 'STATUS_CHANGE' },
    ],
  },
];

async function seedCandidates(
  orgId: string,
  skillIds: Map<string, string>,
  adminUserId: string,
): Promise<void> {
  console.log('\n👤  Demo candidates\n');

  for (const c of DEMO_CANDIDATES) {
    // Check if candidate already exists
    const existing = await prisma.candidate.findFirst({
      where: { email: c.email, organizationId: orgId },
    });

    let candidateId: string;

    if (existing) {
      log('↻', c.email, 'already exists');
      candidateId = existing.id;
    } else {
      const careerStartDate = c.careerStartYear
        ? new Date(`${c.careerStartYear}-01-01`)
        : null;

      const candidate = await prisma.candidate.create({
        data: {
          organizationId: orgId,
          email: c.email,
          firstName: c.firstName,
          lastName: c.lastName,
          phone: c.phone,
          city: c.city,
          country: c.country,
          isRemote: c.isRemote,
          currentTitle: c.currentTitle,
          currentCompany: c.currentCompany,
          careerStartDate: careerStartDate ?? undefined,
          summary: c.summary,
          salaryExpectationMin: c.salaryMin,
          salaryExpectationMax: c.salaryMax,
          salaryCurrency: 'USD',
          status: c.status,
          availabilityStatus: c.availability,
          source: c.source,
          linkedinUrl: c.linkedinUrl,
          createdBy: adminUserId,
          updatedBy: adminUserId,
          lastActivityAt: new Date(),
        },
      });

      candidateId = candidate.id;

      // Assign skills
      for (const s of c.skills) {
        const skillId = skillIds.get(s.name);
        if (!skillId) continue;

        await prisma.candidateSkill.create({
          data: {
            candidateId,
            skillId,
            proficiencyLevel: s.level ?? 'INTERMEDIATE',
            yearsOfExperience: s.years,
            isPrimary: s.primary ?? false,
            assignedBy: adminUserId,
          },
        });
      }

      // Add notes
      for (const n of c.notes ?? []) {
        await prisma.candidateNote.create({
          data: {
            candidateId,
            organizationId: orgId,
            content: n.content,
            noteType: n.type,
            authorId: adminUserId,
            authorEmail: 'admin@acme-demo.com',
            authorName: 'Alice Admin',
          },
        });
      }

      log('+', c.email, `${c.firstName} ${c.lastName} / ${c.status}`);
    }
  }
}

// ── 6. Demo vendors ───────────────────────────────────────────────────────────
//
// The vendor workspace and the vendor list page both depend on a realistic mix
// of vendor states (ACTIVE/PROSPECT/INACTIVE/BLOCKED), priorities, and
// downstream operational data (submissions, interviews, reminders).
//
// What we seed:
//   • Apex Talent          ACTIVE / STRATEGIC — busy pipeline, recent activity
//   • Bridgewater Partners ACTIVE / HIGH      — active but with stalled rows
//   • CodeCraft Recruiting ACTIVE / NORMAL    — light pipeline
//   • DeltaForce Staffing  PROSPECT           — under evaluation, no submissions
//   • Echo Consulting      INACTIVE           — dormant; historical placements
//   • Forge Outsourcing    BLOCKED            — flagged; do not engage

interface VendorContactSeed {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  phone?: string;
  isPrimary: boolean;
}

interface VendorSeed {
  companyName: string;
  vendorCode: string;
  website: string;
  type: VendorType;
  status: VendorStatus;
  priority: VendorPriority;
  city: string;
  country: string;
  domains: string[];
  description: string;
  commissionRate?: number;
  paymentTermsDays?: number;
  lastActivityDaysAgo: number | null;
  lastContactedDaysAgo: number | null;
  activatedDaysAgo: number | null;
  contacts: VendorContactSeed[];
  notes: Array<{ content: string; type: NoteType }>;
}

const DEMO_VENDORS: VendorSeed[] = [
  {
    companyName: 'Apex Talent Group',
    vendorCode: 'APEX-001',
    website: 'https://apex-talent.example.com',
    type: 'STAFFING_AGENCY',
    status: 'ACTIVE',
    priority: 'STRATEGIC',
    city: 'San Francisco',
    country: 'United States',
    domains: ['Software Engineering', 'Data Science', 'DevOps'],
    description: 'Strategic staffing partner — primary source for senior engineering roles in West Coast tech.',
    commissionRate: 22.5,
    paymentTermsDays: 45,
    lastActivityDaysAgo: 1,
    lastContactedDaysAgo: 3,
    activatedDaysAgo: 380,
    contacts: [
      { firstName: 'Rachel', lastName: 'Stein',   title: 'Account Director', email: 'rachel@apex-talent.example.com', phone: '+1-415-555-1001', isPrimary: true },
      { firstName: 'Diego',  lastName: 'Morales', title: 'Senior Recruiter', email: 'diego@apex-talent.example.com',  phone: '+1-415-555-1002', isPrimary: false },
    ],
    notes: [
      { content: 'Q4 QBR completed. Apex committed to 3 senior engineering hires this quarter. On track.', type: 'MEETING' },
      { content: 'Negotiated commission down from 25% to 22.5% in exchange for exclusivity on Staff+ roles.', type: 'NOTE' },
    ],
  },
  {
    companyName: 'Bridgewater Partners',
    vendorCode: 'BRDG-002',
    website: 'https://bridgewater-partners.example.com',
    type: 'RECRUITMENT_PARTNER',
    status: 'ACTIVE',
    priority: 'HIGH',
    city: 'London',
    country: 'United Kingdom',
    domains: ['Financial Services', 'Backend Engineering'],
    description: 'EU/UK recruitment partner specializing in fintech and regulated industries.',
    commissionRate: 20.0,
    paymentTermsDays: 30,
    lastActivityDaysAgo: 12,
    lastContactedDaysAgo: 18,
    activatedDaysAgo: 220,
    contacts: [
      { firstName: 'Olivia', lastName: 'Hartmann', title: 'Managing Partner', email: 'olivia@bridgewater.example.com', phone: '+44-20-7946-2001', isPrimary: true },
    ],
    notes: [
      { content: 'Pipeline has gone quiet — two stale submissions still open. Reach out next week to unblock.', type: 'NOTE' },
    ],
  },
  {
    companyName: 'CodeCraft Recruiting',
    vendorCode: 'CCFT-003',
    website: 'https://codecraft.example.com',
    type: 'STAFFING_AGENCY',
    status: 'ACTIVE',
    priority: 'NORMAL',
    city: 'Austin',
    country: 'United States',
    domains: ['Frontend Engineering', 'Mobile'],
    description: 'Mid-market staffing agency — quick turnaround for mid-level engineering roles.',
    commissionRate: 25.0,
    paymentTermsDays: 30,
    lastActivityDaysAgo: 5,
    lastContactedDaysAgo: 9,
    activatedDaysAgo: 95,
    contacts: [
      { firstName: 'Marcus', lastName: 'Chen', title: 'Recruiter', email: 'marcus@codecraft.example.com', phone: '+1-512-555-3001', isPrimary: true },
    ],
    notes: [],
  },
  {
    companyName: 'DeltaForce Staffing',
    vendorCode: 'DLTA-004',
    website: 'https://deltaforce.example.com',
    type: 'CONSULTING_FIRM',
    status: 'PROSPECT',
    priority: 'NORMAL',
    city: 'Toronto',
    country: 'Canada',
    domains: ['Data Engineering', 'Analytics'],
    description: 'New prospect — exploring partnership. Demo scheduled.',
    lastActivityDaysAgo: 2,
    lastContactedDaysAgo: 2,
    activatedDaysAgo: null,
    contacts: [
      { firstName: 'Priya', lastName: 'Nair', title: 'BD Lead', email: 'priya@deltaforce.example.com', isPrimary: true },
    ],
    notes: [
      { content: 'Intro call scheduled for next Tuesday. They claim deep bench of Snowflake/dbt talent.', type: 'CALL' },
    ],
  },
  {
    companyName: 'Echo Consulting',
    vendorCode: 'ECHO-005',
    website: 'https://echo-consulting.example.com',
    type: 'CONSULTING_FIRM',
    status: 'INACTIVE',
    priority: 'LOW',
    city: 'Berlin',
    country: 'Germany',
    domains: ['Legacy Systems', 'Java'],
    description: 'Past partner — dormant since their book of business shifted away from our verticals.',
    commissionRate: 18.0,
    paymentTermsDays: 60,
    lastActivityDaysAgo: 180,
    lastContactedDaysAgo: 210,
    activatedDaysAgo: 700,
    contacts: [
      { firstName: 'Stefan', lastName: 'Becker', title: 'Partner', email: 'stefan@echo-consulting.example.com', isPrimary: true },
    ],
    notes: [
      { content: 'Marked inactive after 6 months of no submissions. Keep relationship warm for reactivation.', type: 'NOTE' },
    ],
  },
  {
    companyName: 'Forge Outsourcing',
    vendorCode: 'FORG-006',
    website: 'https://forge-out.example.com',
    type: 'STAFFING_AGENCY',
    status: 'BLOCKED',
    priority: 'LOW',
    city: 'Mumbai',
    country: 'India',
    domains: ['Offshore Development'],
    description: 'Blocked — repeated compliance issues with candidate background checks.',
    lastActivityDaysAgo: 90,
    lastContactedDaysAgo: 95,
    activatedDaysAgo: 400,
    contacts: [],
    notes: [
      { content: 'BLOCKED 2025-11 after two background-check fabrications. Do not re-engage without legal review.', type: 'STATUS_CHANGE' },
    ],
  },
];

async function seedVendors(
  orgId: string,
  adminUserId: string,
): Promise<Map<string, string>> {
  console.log('\n🏭  Demo vendors\n');
  const vendorIds = new Map<string, string>();

  for (const v of DEMO_VENDORS) {
    const existing = await prisma.vendor.findFirst({
      where: { organizationId: orgId, companyName: v.companyName, deletedAt: null },
    });
    if (existing) {
      log('↻', v.companyName, 'already exists');
      vendorIds.set(v.companyName, existing.id);
      continue;
    }

    const primaryContact = v.contacts.find((c) => c.isPrimary);

    const vendor = await prisma.vendor.create({
      data: {
        organizationId: orgId,
        companyName: v.companyName,
        vendorCode: v.vendorCode,
        website: v.website,
        type: v.type,
        status: v.status,
        priority: v.priority,
        city: v.city,
        country: v.country,
        domains: v.domains,
        description: v.description,
        commissionRate: v.commissionRate,
        paymentTermsDays: v.paymentTermsDays,
        relationshipOwnerId: adminUserId,
        primaryContactName:  primaryContact ? `${primaryContact.firstName} ${primaryContact.lastName}` : null,
        primaryContactEmail: primaryContact?.email ?? null,
        primaryContactPhone: primaryContact?.phone ?? null,
        activatedAt:     v.activatedDaysAgo     != null ? daysAgo(v.activatedDaysAgo)     : null,
        lastActivityAt:  v.lastActivityDaysAgo  != null ? daysAgo(v.lastActivityDaysAgo)  : null,
        lastContactedAt: v.lastContactedDaysAgo != null ? daysAgo(v.lastContactedDaysAgo) : null,
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    });
    vendorIds.set(v.companyName, vendor.id);

    for (const c of v.contacts) {
      await prisma.vendorContact.create({
        data: {
          vendorId: vendor.id,
          organizationId: orgId,
          firstName: c.firstName,
          lastName:  c.lastName,
          title:     c.title,
          email:     c.email,
          phone:     c.phone ?? null,
          isPrimary: c.isPrimary,
          createdBy: adminUserId,
        },
      });
    }
    for (const n of v.notes) {
      await prisma.vendorNote.create({
        data: {
          vendorId: vendor.id,
          organizationId: orgId,
          content: n.content,
          noteType: n.type,
          authorId: adminUserId,
          authorEmail: 'admin@acme-demo.com',
          authorName: 'Alice Admin',
        },
      });
    }

    log('+', v.companyName, `${v.status} / ${v.priority} / ${v.contacts.length} contacts`);
  }

  return vendorIds;
}

// ── 7. Demo jobs ──────────────────────────────────────────────────────────────

interface JobSeed {
  reqId: string;
  title: string;
  department: string;
  employmentType: EmploymentType;
  workMode: WorkMode;
  status: JobStatus;
  hiringPriority: JobPriority;
  experienceMin: number;
  experienceMax: number;
  salaryMin: number;
  salaryMax: number;
  city: string;
  country: string;
  description: string;
  openPositions: number;
  openedDaysAgo: number | null;
}

const DEMO_JOBS: JobSeed[] = [
  {
    reqId: 'REQ-0001',
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    status: 'OPEN',
    hiringPriority: 'HIGH',
    experienceMin: 5,
    experienceMax: 9,
    salaryMin: 160000,
    salaryMax: 210000,
    city: 'San Francisco',
    country: 'United States',
    description: 'Build and own end-to-end features across our React/Node stack. Tight feedback loop with product + design.',
    openPositions: 2,
    openedDaysAgo: 35,
  },
  {
    reqId: 'REQ-0002',
    title: 'Staff Backend Engineer',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    status: 'OPEN',
    hiringPriority: 'URGENT',
    experienceMin: 8,
    experienceMax: 14,
    salaryMin: 220000,
    salaryMax: 280000,
    city: 'New York',
    country: 'United States',
    description: 'Lead platform architecture for our payments domain. Heavy Go/Postgres background required.',
    openPositions: 1,
    openedDaysAgo: 22,
  },
  {
    reqId: 'REQ-0003',
    title: 'Senior Data Engineer',
    department: 'Data',
    employmentType: 'FULL_TIME',
    workMode: 'REMOTE',
    status: 'OPEN',
    hiringPriority: 'NORMAL',
    experienceMin: 4,
    experienceMax: 8,
    salaryMin: 130000,
    salaryMax: 170000,
    city: 'Austin',
    country: 'United States',
    description: 'Own our analytics warehouse. Snowflake, dbt, and Airflow stack. Partner with product analytics.',
    openPositions: 1,
    openedDaysAgo: 14,
  },
  {
    reqId: 'REQ-0004',
    title: 'Engineering Manager — Platform',
    department: 'Engineering',
    employmentType: 'FULL_TIME',
    workMode: 'HYBRID',
    status: 'FILLED',
    hiringPriority: 'HIGH',
    experienceMin: 8,
    experienceMax: 15,
    salaryMin: 240000,
    salaryMax: 310000,
    city: 'New York',
    country: 'United States',
    description: 'Engineering manager for our platform org — coverage across infra, observability, and developer tooling.',
    openPositions: 1,
    openedDaysAgo: 90,
  },
];

async function seedJobs(orgId: string, adminUserId: string): Promise<Map<string, string>> {
  console.log('\n💼  Demo jobs\n');
  const jobIds = new Map<string, string>();

  for (const j of DEMO_JOBS) {
    const existing = await prisma.jobDescription.findFirst({
      where: { organizationId: orgId, reqId: j.reqId },
    });
    if (existing) {
      log('↻', j.reqId, 'already exists');
      jobIds.set(j.reqId, existing.id);
      continue;
    }
    const opened = j.openedDaysAgo != null ? daysAgo(j.openedDaysAgo) : null;
    const job = await prisma.jobDescription.create({
      data: {
        organizationId: orgId,
        reqId: j.reqId,
        title: j.title,
        department: j.department,
        employmentType: j.employmentType,
        workMode: j.workMode,
        status: j.status,
        hiringPriority: j.hiringPriority,
        experienceMin: j.experienceMin,
        experienceMax: j.experienceMax,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryCurrency: 'USD',
        salaryType: 'ANNUAL',
        city: j.city,
        country: j.country,
        description: j.description,
        openPositions: j.openPositions,
        filledPositions: j.status === 'FILLED' ? j.openPositions : 0,
        openedAt: opened,
        closedAt: j.status === 'FILLED' && opened ? new Date(opened.getTime() + 30 * DAY) : null,
        hiringManagerId: adminUserId,
        hiringManagerName: 'Alice Admin',
        createdBy: adminUserId,
        updatedBy: adminUserId,
      },
    });
    jobIds.set(j.reqId, job.id);
    log('+', j.reqId, `${j.title} / ${j.status}`);
  }

  return jobIds;
}

// ── 8. Demo submissions, interviews, reminders ────────────────────────────────
//
// The submission mix is the centrepiece — it drives every workspace signal:
// active counts, stalled counts, pipeline funnel, top recruiters, health badges.
//
// We craft submissions that exercise:
//   • Active states (SUBMITTED → INTERVIEW → OFFERED)
//   • Stalled states (recent updatedAt > 7 days while still active)
//   • Closed states (PLACED, REJECTED, WITHDRAWN)
//   • Direct-source (no vendor) and vendor-routed
//   • Multiple recruiters as owners (admin + recruiter)

interface SubmissionSeed {
  candidateEmail: string;
  jobReqId: string;
  vendorName: string | null;
  ownerEmail: string;
  status: SubmissionStatus;
  createdDaysAgo: number;
  updatedDaysAgo: number; // drives stalled detection
  billRate?: number;
  payRate?: number;
  offerSalary?: number;
  coverNote?: string;
}

const DEMO_SUBMISSIONS: SubmissionSeed[] = [
  // Apex Talent — busy, healthy pipeline
  { candidateEmail: 'sarah.chen@email.com',       jobReqId: 'REQ-0001', vendorName: 'Apex Talent Group',     ownerEmail: 'recruiter@acme-demo.com', status: 'INTERVIEW',    createdDaysAgo: 12, updatedDaysAgo: 1, billRate: 180, payRate: 145 },
  { candidateEmail: 'nina.vasquez@email.com',     jobReqId: 'REQ-0002', vendorName: 'Apex Talent Group',     ownerEmail: 'recruiter@acme-demo.com', status: 'OFFERED',      createdDaysAgo: 25, updatedDaysAgo: 2, offerSalary: 235000 },
  { candidateEmail: 'ryan.park@email.com',        jobReqId: 'REQ-0002', vendorName: 'Apex Talent Group',     ownerEmail: 'recruiter@acme-demo.com', status: 'SHORTLISTED',  createdDaysAgo: 8,  updatedDaysAgo: 3 },
  { candidateEmail: 'fatima.al-rashid@email.com', jobReqId: 'REQ-0001', vendorName: 'Apex Talent Group',     ownerEmail: 'admin@acme-demo.com',     status: 'UNDER_REVIEW', createdDaysAgo: 4,  updatedDaysAgo: 2 },

  // Bridgewater — active but with two stalled rows
  { candidateEmail: 'marcus.okafor@email.com',    jobReqId: 'REQ-0002', vendorName: 'Bridgewater Partners',  ownerEmail: 'recruiter@acme-demo.com', status: 'SUBMITTED',    createdDaysAgo: 20, updatedDaysAgo: 15 }, // STALLED
  { candidateEmail: 'james.oconnor@email.com',    jobReqId: 'REQ-0001', vendorName: 'Bridgewater Partners',  ownerEmail: 'admin@acme-demo.com',     status: 'ON_HOLD',      createdDaysAgo: 30, updatedDaysAgo: 11 }, // STALLED

  // CodeCraft — small light pipeline
  { candidateEmail: 'david.kowalski@email.com',   jobReqId: 'REQ-0001', vendorName: 'CodeCraft Recruiting',  ownerEmail: 'recruiter@acme-demo.com', status: 'SUBMITTED',    createdDaysAgo: 6,  updatedDaysAgo: 4 },

  // Direct-sourced (no vendor)
  { candidateEmail: 'priya.sharma@email.com',     jobReqId: 'REQ-0003', vendorName: null,                    ownerEmail: 'recruiter@acme-demo.com', status: 'INTERVIEW',    createdDaysAgo: 10, updatedDaysAgo: 1 },
  { candidateEmail: 'aisha.diallo@email.com',     jobReqId: 'REQ-0003', vendorName: null,                    ownerEmail: 'admin@acme-demo.com',     status: 'UNDER_REVIEW', createdDaysAgo: 3,  updatedDaysAgo: 1 },

  // Closed history — feeds top-recruiters + placed history
  { candidateEmail: 'alex.chen@email.com',        jobReqId: 'REQ-0004', vendorName: 'Apex Talent Group',     ownerEmail: 'recruiter@acme-demo.com', status: 'PLACED',       createdDaysAgo: 80, updatedDaysAgo: 60, offerSalary: 310000 },
  { candidateEmail: 'emma.lindqvist@email.com',   jobReqId: 'REQ-0001', vendorName: 'Apex Talent Group',     ownerEmail: 'recruiter@acme-demo.com', status: 'REJECTED',     createdDaysAgo: 50, updatedDaysAgo: 40 },
  { candidateEmail: 'tom.harris@email.com',       jobReqId: 'REQ-0004', vendorName: 'Bridgewater Partners',  ownerEmail: 'admin@acme-demo.com',     status: 'WITHDRAWN',    createdDaysAgo: 55, updatedDaysAgo: 45 },
];

function stageTimestamps(status: SubmissionStatus, updated: Date) {
  // Set stage timestamps according to the status reached. Approximations are
  // fine — they exist so the timeline UI has something to render.
  const t = updated.getTime();
  const ts = {
    submittedAt:   null as Date | null,
    reviewedAt:    null as Date | null,
    shortlistedAt: null as Date | null,
    interviewAt:   null as Date | null,
    offeredAt:     null as Date | null,
    placedAt:      null as Date | null,
    rejectedAt:    null as Date | null,
    withdrawnAt:   null as Date | null,
    closedAt:      null as Date | null,
  };
  const reaches = (s: SubmissionStatus) => {
    const order: SubmissionStatus[] = ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW', 'OFFERED', 'PLACED'];
    const idx = order.indexOf(status);
    const want = order.indexOf(s);
    return idx >= 0 && want >= 0 && idx >= want;
  };
  if (reaches('SUBMITTED'))    ts.submittedAt   = new Date(t - 6 * DAY);
  if (reaches('UNDER_REVIEW')) ts.reviewedAt    = new Date(t - 5 * DAY);
  if (reaches('SHORTLISTED'))  ts.shortlistedAt = new Date(t - 4 * DAY);
  if (reaches('INTERVIEW'))    ts.interviewAt   = new Date(t - 3 * DAY);
  if (reaches('OFFERED'))      ts.offeredAt     = new Date(t - 1 * DAY);
  if (status === 'PLACED')     ts.placedAt      = updated;
  if (status === 'REJECTED')   ts.rejectedAt    = updated;
  if (status === 'WITHDRAWN')  ts.withdrawnAt   = updated;
  if (status === 'PLACED' || status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CLOSED') {
    ts.closedAt = updated;
  }
  return ts;
}

async function seedSubmissionsAndPipeline(
  orgId: string,
  userIds: Map<string, string>,
  vendorIds: Map<string, string>,
  jobIds: Map<string, string>,
): Promise<void> {
  console.log('\n📝  Demo submissions, interviews, reminders\n');

  // Build a candidate-email → id map by querying once.
  const candidates = await prisma.candidate.findMany({
    where: { organizationId: orgId },
    select: { id: true, email: true },
  });
  const candidateByEmail = new Map(candidates.map((c) => [c.email, c.id]));

  let created = 0;
  let skipped = 0;
  const submissionIds: string[] = [];

  for (const s of DEMO_SUBMISSIONS) {
    const candidateId = candidateByEmail.get(s.candidateEmail);
    const jobId       = jobIds.get(s.jobReqId);
    const ownerId     = userIds.get(s.ownerEmail);
    if (!candidateId || !jobId || !ownerId) {
      log('⚠', s.candidateEmail, `missing candidate/job/owner — skipping`);
      skipped++;
      continue;
    }
    const vendorId = s.vendorName ? vendorIds.get(s.vendorName) : null;

    // Idempotency: only one submission per (candidate, job, org).
    const existing = await prisma.submission.findFirst({
      where: { organizationId: orgId, candidateId, jobId, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      submissionIds.push(existing.id);
      skipped++;
      continue;
    }

    const createdAt = daysAgo(s.createdDaysAgo);
    const updatedAt = daysAgo(s.updatedDaysAgo);
    const ts = stageTimestamps(s.status, updatedAt);

    const sub = await prisma.submission.create({
      data: {
        organizationId: orgId,
        candidateId,
        jobId,
        vendorId: vendorId ?? null,
        ownerId,
        createdById: ownerId,
        status: s.status,
        billRate: s.billRate,
        payRate: s.payRate,
        offerSalary: s.offerSalary,
        currency: 'USD',
        coverNote: s.coverNote,
        createdAt,
        updatedAt,
        ...ts,
      },
    });
    submissionIds.push(sub.id);

    // Append the initial status-history entry so the timeline isn't empty.
    await prisma.submissionStatusHistory.create({
      data: {
        submissionId: sub.id,
        fromStatus: null,
        toStatus: s.status,
        changedById: ownerId,
        createdAt,
      },
    });
    created++;
  }

  log('+', `${created} submissions`, `${skipped} already existed`);

  // ── Interviews ────────────────────────────────────────────────────────────
  // Pull the active submissions and attach a few interviews for the workspace
  // upcoming/feedback widgets.

  const active = await prisma.submission.findMany({
    where: {
      organizationId: orgId,
      status: { in: ['INTERVIEW', 'OFFERED', 'SHORTLISTED'] },
      deletedAt: null,
    },
    select: { id: true, candidateId: true, jobId: true, ownerId: true, status: true, vendorId: true },
    orderBy: { createdAt: 'desc' },
  });

  let interviewsCreated = 0;
  const interviewIds: string[] = [];

  for (const [i, sub] of active.slice(0, 4).entries()) {
    const existing = await prisma.interview.findFirst({
      where: { submissionId: sub.id, deletedAt: null },
      select: { id: true },
    });
    if (existing) {
      interviewIds.push(existing.id);
      continue;
    }

    // Vary upcoming + completed:
    //   i=0 → CONFIRMED, upcoming tomorrow
    //   i=1 → SCHEDULED, upcoming in 3 days
    //   i=2 → FEEDBACK_PENDING, completed 2 days ago
    //   i=3 → COMPLETED, completed 5 days ago
    const variants: Array<{ status: InterviewStatus; type: InterviewType; round: number; label: string; scheduledAt: Date; completedAt: Date | null }> = [
      { status: 'CONFIRMED',        type: 'VIDEO',     round: 1, label: 'Recruiter screen', scheduledAt: hoursFromNow(28), completedAt: null },
      { status: 'SCHEDULED',        type: 'TECHNICAL', round: 2, label: 'Technical',        scheduledAt: daysFromNow(3),   completedAt: null },
      { status: 'FEEDBACK_PENDING', type: 'PANEL',     round: 2, label: 'Hiring panel',     scheduledAt: daysAgo(2),       completedAt: daysAgo(2) },
      { status: 'COMPLETED',        type: 'PHONE',     round: 1, label: 'Initial screen',   scheduledAt: daysAgo(5),       completedAt: daysAgo(5) },
    ];
    const variant = variants[i]!;

    const iv = await prisma.interview.create({
      data: {
        organizationId: orgId,
        submissionId: sub.id,
        candidateId: sub.candidateId,
        jobId: sub.jobId,
        ownerId: sub.ownerId,
        createdById: sub.ownerId,
        round: variant.round,
        roundLabel: variant.label,
        type: variant.type,
        status: variant.status,
        scheduledAt: variant.scheduledAt,
        durationMinutes: 60,
        timezone: 'America/Los_Angeles',
        location: variant.type === 'ONSITE' ? '350 Mission St, San Francisco' : 'https://meet.example.com/iv-' + sub.id.slice(0, 8),
        confirmedAt: variant.status === 'CONFIRMED' ? daysAgo(1) : null,
        completedAt: variant.completedAt,
        interviewerName: 'Alice Admin',
        interviewerEmail: 'admin@acme-demo.com',
        interviewerId: userIds.get('admin@acme-demo.com') ?? null,
      },
    });
    interviewIds.push(iv.id);
    interviewsCreated++;
  }

  log('+', `${interviewsCreated} interviews`, 'mix of upcoming + feedback-pending');

  // ── Reminders ─────────────────────────────────────────────────────────────
  // The workspace pulls vendor-linked reminders transitively via the vendor's
  // submissions/interviews. Sprinkle a few so the workspace shows real work.

  const adminId = userIds.get('admin@acme-demo.com')!;
  const recruiterId = userIds.get('recruiter@acme-demo.com')!;

  const reminderSeeds: Array<{
    type: ReminderType;
    title: string;
    description?: string;
    priority: ReminderPriority;
    status: ReminderStatus;
    dueAt: Date;
    assigneeId: string;
    submissionId?: string;
    interviewId?: string;
  }> = [];

  // Upcoming interview reminder (CONFIRMED interview tomorrow)
  if (interviewIds[0]) {
    reminderSeeds.push({
      type: 'UPCOMING_INTERVIEW',
      title: 'Interview tomorrow — confirm calendar invites',
      description: 'Make sure both interviewer and candidate received the invite.',
      priority: 'HIGH',
      status: 'PENDING',
      dueAt: hoursFromNow(20),
      assigneeId: recruiterId,
      interviewId: interviewIds[0],
    });
  }
  // Feedback pending reminder (overdue)
  if (interviewIds[2]) {
    reminderSeeds.push({
      type: 'INTERVIEW_FEEDBACK_PENDING',
      title: 'Collect feedback from yesterday\'s panel',
      description: 'Three interviewers — chase Olivia and Marcus.',
      priority: 'CRITICAL',
      status: 'PENDING',
      dueAt: daysAgo(1), // overdue
      assigneeId: recruiterId,
      interviewId: interviewIds[2],
    });
  }
  // Stalled workflow on Bridgewater submission
  const stalledSub = await prisma.submission.findFirst({
    where: { organizationId: orgId, status: 'SUBMITTED', updatedAt: { lt: daysAgo(7) }, deletedAt: null },
    select: { id: true },
  });
  if (stalledSub) {
    reminderSeeds.push({
      type: 'STALLED_WORKFLOW',
      title: 'Submission stalled 15+ days — chase client',
      description: 'No response from the client. Try Olivia at Bridgewater.',
      priority: 'HIGH',
      status: 'PENDING',
      dueAt: daysFromNow(1),
      assigneeId: recruiterId,
      submissionId: stalledSub.id,
    });
  }
  // Generic recruiter action
  reminderSeeds.push({
    type: 'RECRUITER_ACTION_REQUIRED',
    title: 'Apex QBR prep deck',
    description: 'Quarterly business review with Apex next week — pull placement numbers.',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueAt: daysFromNow(4),
    assigneeId: adminId,
  });

  let remindersCreated = 0;
  for (const r of reminderSeeds) {
    // Idempotency by (org, type, title, assignee)
    const existing = await prisma.reminder.findFirst({
      where: { organizationId: orgId, type: r.type, title: r.title, assigneeId: r.assigneeId, deletedAt: null },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.reminder.create({
      data: {
        organizationId: orgId,
        type: r.type,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        dueAt: r.dueAt,
        assigneeId: r.assigneeId,
        createdById: adminId,
        submissionId: r.submissionId ?? null,
        interviewId: r.interviewId ?? null,
        isAutoGenerated: r.type !== 'RECRUITER_ACTION_REQUIRED',
      },
    });
    remindersCreated++;
  }
  log('+', `${remindersCreated} reminders`, 'upcoming, overdue, stalled');
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seedOrgSubscription(orgId: string, planId: string): Promise<void> {
  const existing = await prisma.subscription.findFirst({ where: { organizationId: orgId } });
  if (existing) {
    log('↻', 'demo subscription', 'already exists');
    return;
  }
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  await prisma.subscription.create({
    data: {
      organizationId: orgId,
      planId,
      status: 'ACTIVE',
      currentPeriodStart: now,
      currentPeriodEnd: end,
      seatLimit: 15,
      seatsUsed: 3,
    },
  });
  log('+', 'demo subscription', 'PROFESSIONAL / ACTIVE');
}

async function main(): Promise<void> {
  console.log('🌱  Starting seed...');

  const roleIds = await seedRoles();
  const planIds = await seedPlans();
  const orgId = await seedOrg();
  await seedOrgSubscription(orgId, planIds.get('PROFESSIONAL')!);
  const userIds = await seedUsers(orgId, roleIds);
  const skillIds = await seedSkills();

  const adminId = userIds.get('admin@acme-demo.com');
  if (!adminId) throw new Error('Admin user not found after seed');

  await seedCandidates(orgId, skillIds, adminId);
  const vendorIds = await seedVendors(orgId, adminId);
  const jobIds    = await seedJobs(orgId, adminId);
  await seedSubmissionsAndPipeline(orgId, userIds, vendorIds, jobIds);

  console.log('\n✅  Seed complete.\n');
  console.log('──────────────────────────────────────────────────────');
  console.log('  Login at:   http://localhost:3000/login');
  console.log('  Org slug:   acme');
  console.log('  Password:   Demo1234!');
  console.log('');
  console.log('  admin@acme-demo.com     → org_admin  (full access)');
  console.log('  recruiter@acme-demo.com → recruiter  (candidates + jobs)');
  console.log('  viewer@acme-demo.com    → viewer     (read-only)');
  console.log('──────────────────────────────────────────────────────\n');
}

main()
  .catch((err: unknown) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
