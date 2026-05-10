'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateJob } from '@/hooks/use-jobs';
import type { CreateJobDto, EmploymentType, WorkMode, JobPriority, SalaryType } from '@/types/jobs';

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'FULL_TIME', label: 'Full-time' },
  { value: 'PART_TIME', label: 'Part-time' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'CONTRACT_TO_HIRE', label: 'Contract-to-hire' },
  { value: 'FREELANCE', label: 'Freelance' },
  { value: 'INTERNSHIP', label: 'Internship' },
];

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: 'ONSITE', label: 'On-site' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const PRIORITIES: { value: JobPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

const SALARY_TYPES: { value: SalaryType; label: string }[] = [
  { value: 'ANNUAL', label: 'Annual' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'TOTAL_COMPENSATION', label: 'Total compensation' },
];

const FIELD_CLASS = 'flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';
const LABEL_CLASS = 'text-xs font-medium text-muted-foreground';
const TEXTAREA_CLASS = 'flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y';

export default function NewJobPage() {
  const createMutation = useCreateJob();

  const [form, setForm] = useState<CreateJobDto>({
    title: '',
    employmentType: 'FULL_TIME',
    workMode: 'ONSITE',
    hiringPriority: 'NORMAL',
    salaryType: 'ANNUAL',
    openPositions: 1,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: keyof CreateJobDto, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title?.trim()) e.title = 'Title is required';
    if (form.experienceMin !== undefined && form.experienceMax !== undefined) {
      if (form.experienceMin > form.experienceMax) e.experienceMin = 'Min must be ≤ max';
    }
    if (form.salaryMin !== undefined && form.salaryMax !== undefined) {
      if (form.salaryMin > form.salaryMax) e.salaryMin = 'Min must be ≤ max';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const payload: CreateJobDto = { ...form };
    // Strip undefined/empty strings
    (Object.keys(payload) as (keyof CreateJobDto)[]).forEach((k) => {
      if (payload[k] === '' || payload[k] === undefined) delete payload[k];
    });
    await createMutation.mutateAsync(payload);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="New Job"
        description="Create a new job requisition"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Jobs', href: '/jobs' },
          { title: 'New Job' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Basic information</h3>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Job title *</label>
              <Input
                value={form.title ?? ''}
                onChange={(e) => set('title', e.target.value)}
                placeholder="e.g. Senior Backend Engineer"
                className={errors.title ? 'border-destructive' : ''}
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Department</label>
              <Input
                value={form.department ?? ''}
                onChange={(e) => set('department', e.target.value)}
                placeholder="e.g. Engineering, Sales, Finance"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Employment type</label>
                <select
                  value={form.employmentType}
                  onChange={(e) => set('employmentType', e.target.value as EmploymentType)}
                  className={FIELD_CLASS}
                >
                  {EMPLOYMENT_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Work mode</label>
                <select
                  value={form.workMode}
                  onChange={(e) => set('workMode', e.target.value as WorkMode)}
                  className={FIELD_CLASS}
                >
                  {WORK_MODES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Priority</label>
                <select
                  value={form.hiringPriority}
                  onChange={(e) => set('hiringPriority', e.target.value as JobPriority)}
                  className={FIELD_CLASS}
                >
                  {PRIORITIES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Open positions</label>
                <Input
                  type="number"
                  min="1"
                  value={form.openPositions ?? 1}
                  onChange={(e) => set('openPositions', parseInt(e.target.value))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Experience &amp; compensation</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Min experience (years)</label>
                <Input
                  type="number"
                  min="0"
                  value={form.experienceMin ?? ''}
                  onChange={(e) => set('experienceMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 3"
                  className={errors.experienceMin ? 'border-destructive' : ''}
                />
                {errors.experienceMin && <p className="text-xs text-destructive">{errors.experienceMin}</p>}
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Max experience (years)</label>
                <Input
                  type="number"
                  min="0"
                  value={form.experienceMax ?? ''}
                  onChange={(e) => set('experienceMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 7"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Salary min</label>
                <Input
                  type="number"
                  min="0"
                  value={form.salaryMin ?? ''}
                  onChange={(e) => set('salaryMin', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 80000"
                  className={errors.salaryMin ? 'border-destructive' : ''}
                />
                {errors.salaryMin && <p className="text-xs text-destructive">{errors.salaryMin}</p>}
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Salary max</label>
                <Input
                  type="number"
                  min="0"
                  value={form.salaryMax ?? ''}
                  onChange={(e) => set('salaryMax', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="e.g. 120000"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Salary type</label>
                <select
                  value={form.salaryType ?? 'ANNUAL'}
                  onChange={(e) => set('salaryType', e.target.value as SalaryType)}
                  className={FIELD_CLASS}
                >
                  {SALARY_TYPES.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Currency (ISO 4217)</label>
              <Input
                value={form.salaryCurrency ?? ''}
                onChange={(e) => set('salaryCurrency', e.target.value.toUpperCase())}
                placeholder="USD"
                maxLength={3}
                className="w-24"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Location</h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>City</label>
                <Input
                  value={form.city ?? ''}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder="e.g. Austin"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>State / Province</label>
                <Input
                  value={form.stateProvince ?? ''}
                  onChange={(e) => set('stateProvince', e.target.value)}
                  placeholder="e.g. TX"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Country</label>
                <Input
                  value={form.country ?? ''}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder="e.g. United States"
                />
              </div>

              <div className="space-y-1.5">
                <label className={LABEL_CLASS}>Timezone</label>
                <Input
                  value={form.timezone ?? ''}
                  onChange={(e) => set('timezone', e.target.value)}
                  placeholder="e.g. America/Chicago"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <h3 className="text-sm font-semibold">Job content</h3>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Description</label>
              <textarea
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value)}
                rows={4}
                placeholder="Full job description..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Requirements</label>
              <textarea
                value={form.requirements ?? ''}
                onChange={(e) => set('requirements', e.target.value)}
                rows={4}
                placeholder="Required qualifications and experience..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Nice to have</label>
              <textarea
                value={form.niceToHave ?? ''}
                onChange={(e) => set('niceToHave', e.target.value)}
                rows={3}
                placeholder="Preferred but not required..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Benefits</label>
              <textarea
                value={form.benefits ?? ''}
                onChange={(e) => set('benefits', e.target.value)}
                rows={3}
                placeholder="Compensation, perks, benefits..."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div className="space-y-1.5">
              <label className={LABEL_CLASS}>Target hire date</label>
              <Input
                type="date"
                value={form.targetHireDate ?? ''}
                onChange={(e) => set('targetHireDate', e.target.value || undefined)}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        {createMutation.isError && (
          <p className="text-sm text-destructive">
            Failed to create job. Please check the form and try again.
          </p>
        )}

        <div className="flex gap-3">
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Create job
          </Button>
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
