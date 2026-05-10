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

import { PrismaClient, SkillCategory, NoteType, CandidateSource } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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

// ── 2. Demo organisation ──────────────────────────────────────────────────────

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

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱  Starting seed...');

  const roleIds = await seedRoles();
  const orgId = await seedOrg();
  const userIds = await seedUsers(orgId, roleIds);
  const skillIds = await seedSkills();

  const adminId = userIds.get('admin@acme-demo.com');
  if (!adminId) throw new Error('Admin user not found after seed');

  await seedCandidates(orgId, skillIds, adminId);

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
