/**
 * VR fixture seed — deterministic tenant for Playwright visual regression.
 *
 * All timestamps are computed from `ANCHOR_ISO` (not Date.now) so re-running
 * this script produces byte-identical rows. This is critical: a "1 day ago"
 * relative timestamp in the UI would drift the pixel diff every day if the
 * underlying date column changed.
 *
 * Run:   pnpm --filter @repo/database db:seed:vr
 * Safe:  purges + reseeds the `vr-tenant` organization only. Other tenants
 *        are untouched.
 *
 * What it seeds (this pass):
 *   • 1 organization (slug: vr-tenant)
 *   • 1 recruiter user (vr@vr-tenant.demo / Demo1234!)
 *   • 10 skills catalogue entries (idempotent — reused globally)
 *   • 60 candidates with deterministic names / titles / locations
 *
 * What it does NOT seed yet (follow-up during first capture run):
 *   • Jobs / Submissions / Interviews / Reminders / Vendors
 *
 * The dashboard baselines will therefore render with empty action lists on
 * the first capture. The follow-up PR that runs the capture will extend
 * this script with the missing entities — see docs/implementation/
 * visual-verification.md § "Follow-up during first capture run".
 */

import {
  PrismaClient,
  CandidateSource, CandidateStatus, AvailabilityStatus,
  SkillCategory, ProficiencyLevel,
  OrgPlan,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const ANCHOR_ISO   = '2026-07-01T09:00:00.000Z';
const ANCHOR_MS    = Date.parse(ANCHOR_ISO);
const HOUR         = 60 * 60 * 1000;
const DAY          = 24 * HOUR;
const daysBefore   = (d: number) => new Date(ANCHOR_MS - d * DAY);

const TENANT_SLUG   = 'vr-tenant';
const TENANT_NAME   = 'VR Fixture Org';
const RECRUITER_EMAIL = 'vr@vr-tenant.demo';
const PASSWORD_HASH = bcrypt.hashSync('Demo1234!', 12);

const prisma = new PrismaClient();

async function main() {
  console.log(`[seed-vr] anchor = ${ANCHOR_ISO}`);

  // ── 1. Organization ──────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where:  { slug: TENANT_SLUG },
    create: {
      slug: TENANT_SLUG,
      name: TENANT_NAME,
      plan: OrgPlan.STARTER,
      status: 'ACTIVE',
      settings: {},
      createdAt: daysBefore(90),
    },
    update: { name: TENANT_NAME },
  });
  console.log(`[seed-vr] org ${org.id.slice(0, 8)} (${org.slug})`);

  // Purge candidate-adjacent tenant data so re-runs are deterministic.
  await prisma.candidateSkill.deleteMany({ where: { candidate: { organizationId: org.id } } });
  await prisma.candidateNote.deleteMany({ where: { candidate: { organizationId: org.id } } });
  await prisma.candidate.deleteMany({ where: { organizationId: org.id } });

  // ── 2. Recruiter user ────────────────────────────────────────────
  const recruiter = await prisma.user.upsert({
    where:  { organizationId_email: { organizationId: org.id, email: RECRUITER_EMAIL } },
    create: {
      email:          RECRUITER_EMAIL,
      firstName:      'Vera',
      lastName:       'Recruiter',
      passwordHash:   PASSWORD_HASH,
      organizationId: org.id,
      status:         'ACTIVE',
      createdAt:      daysBefore(60),
    },
    update: {},
  });
  console.log(`[seed-vr] user ${recruiter.email}`);

  // ── 3. Skills catalog (global) ───────────────────────────────────
  const skillNames = [
    ['React',      SkillCategory.FRAMEWORK_LIBRARY],
    ['TypeScript', SkillCategory.PROGRAMMING_LANGUAGE],
    ['Node.js',    SkillCategory.FRAMEWORK_LIBRARY],
    ['Python',     SkillCategory.PROGRAMMING_LANGUAGE],
    ['Go',         SkillCategory.PROGRAMMING_LANGUAGE],
    ['PostgreSQL', SkillCategory.DATABASE],
    ['Kubernetes', SkillCategory.CLOUD_INFRASTRUCTURE],
    ['AWS',        SkillCategory.CLOUD_INFRASTRUCTURE],
    ['Docker',     SkillCategory.DEVOPS],
    ['gRPC',       SkillCategory.FRAMEWORK_LIBRARY],
  ] as const;
  const skills = await Promise.all(skillNames.map(([name, category]) =>
    prisma.skill.upsert({
      where:  { name },
      create: { name, displayName: name, category },
      update: {},
    })
  ));
  console.log(`[seed-vr] ${skills.length} skills catalog`);

  // ── 4. Candidates ────────────────────────────────────────────────
  const FIRSTS = ['Sarah', 'Jamal', 'Maria', 'Priya', 'Omar', 'Lin', 'Fatima', 'James', 'Aisha', 'Hana', 'Yusuf', 'Chen'];
  const LASTS  = ['Smith', 'Khan', 'Lopez', 'Patel', 'Hassan', 'Wei', 'Rashid', 'Connor', 'Diallo', 'Kim'];
  const TITLES = ['Senior Engineer', 'Platform Engineer', 'Staff Engineer', 'Tech Lead', 'ML Engineer', 'Frontend Architect'];
  const CITIES = ['San Francisco', 'Toronto', 'Madrid', 'Bengaluru', 'Cairo', 'Shenzhen'];
  const COUNTRIES = ['US', 'CA', 'ES', 'IN', 'EG', 'CN'];

  for (let i = 0; i < 60; i++) {
    const first = FIRSTS[i % FIRSTS.length]!;
    const last  = LASTS[(i * 3) % LASTS.length]!;
    // Bucket: 40 ACTIVE, 15 AVAILABLE, 5 PLACED
    const status: CandidateStatus =
      i < 40 ? CandidateStatus.ACTIVE
      : i < 55 ? CandidateStatus.AVAILABLE
      :          CandidateStatus.PLACED;
    const availability: AvailabilityStatus =
      i % 5 === 0 ? AvailabilityStatus.IMMEDIATELY
      : i % 3 === 0 ? AvailabilityStatus.TWO_WEEKS
      :               AvailabilityStatus.ONE_MONTH;
    const cityIdx = i % CITIES.length;

    // careerStartDate anchors the derived experienceYears (2 to 13 years).
    const yearsExp = 2 + (i % 12);
    const careerStartDate = new Date(ANCHOR_MS - yearsExp * 365 * DAY);

    const cand = await prisma.candidate.create({
      data: {
        organizationId:     org.id,
        firstName:          first,
        lastName:           `${last}${i > 9 ? `-${i}` : ''}`,
        email:              `vr+${i.toString().padStart(2, '0')}@vr-tenant.demo`,
        status,
        availabilityStatus: availability,
        source:             CandidateSource.MANUAL,
        currentTitle:       TITLES[i % TITLES.length]!,
        currentCompany:     'Prior Employer Inc.',
        city:               CITIES[cityIdx]!,
        country:            COUNTRIES[cityIdx]!,
        isRemote:           i % 3 === 0,
        careerStartDate,
        createdAt:          daysBefore(60 - (i % 30)),
        lastActivityAt:     daysBefore((i % 12) + 1),
        createdBy:          recruiter.id,
      },
    });

    // 2–4 primary skills per candidate.
    const skillCount = 2 + (i % 3);
    for (let s = 0; s < skillCount; s++) {
      const skill = skills[(i + s) % skills.length]!;
      await prisma.candidateSkill.create({
        data: {
          candidateId:       cand.id,
          skillId:           skill.id,
          proficiencyLevel:  (['INTERMEDIATE', 'ADVANCED', 'EXPERT'] as ProficiencyLevel[])[s % 3]!,
          yearsOfExperience: 1 + s * 2,
          isPrimary:         s === 0,
        },
      });
    }
  }
  console.log(`[seed-vr] 60 candidates seeded`);

  console.log(`\n[seed-vr] complete. Login: ${RECRUITER_EMAIL} / Demo1234! (workspace: ${TENANT_SLUG})`);
  console.log(`[seed-vr] follow-up: extend with jobs/submissions/interviews/reminders during first capture run.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
