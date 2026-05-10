'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useCreateVendor } from '@/hooks/use-vendors';
import type { CreateVendorDto, VendorPriority, VendorType } from '@/types/vendors';

const TYPE_OPTIONS: { value: VendorType; label: string }[] = [
  { value: 'STAFFING_AGENCY',     label: 'Staffing Agency'       },
  { value: 'CONSULTING_FIRM',     label: 'Consulting Firm'       },
  { value: 'FREELANCE_PLATFORM',  label: 'Freelance Platform'    },
  { value: 'RECRUITMENT_PARTNER', label: 'Recruitment Partner'   },
  { value: 'DIRECT_CLIENT',       label: 'Direct Client'         },
  { value: 'OTHER',               label: 'Other'                 },
];

const PRIORITY_OPTIONS: { value: VendorPriority; label: string }[] = [
  { value: 'LOW',       label: 'Low'       },
  { value: 'NORMAL',    label: 'Normal'    },
  { value: 'HIGH',      label: 'High'      },
  { value: 'STRATEGIC', label: 'Strategic' },
];

export default function NewVendorPage() {
  const { mutate, isPending, error } = useCreateVendor();
  const [domainsInput, setDomainsInput] = useState('');
  const [form, setForm] = useState<CreateVendorDto>({
    companyName: '',
    type: 'STAFFING_AGENCY',
    priority: 'NORMAL',
  });

  const set = <K extends keyof CreateVendorDto>(
    key: K,
    value: CreateVendorDto[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const domains = domainsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    mutate({ ...form, domains: domains.length ? domains : undefined });
  };

  const errorMessage =
    error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { data?: { error?: { message?: string } } } })
          .response?.data?.error?.message ?? 'An error occurred'
      : 'An error occurred';

  return (
    <div className="space-y-6">
      <PageHeader
        title="New vendor"
        description="Add a staffing partner or recruitment relationship"
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Vendors', href: '/vendors' },
          { title: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {/* ── Company information ──────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium">Company information</h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Company name <span className="text-destructive">*</span>
              </label>
              <Input
                required
                placeholder="Acme Staffing Inc."
                value={form.companyName}
                onChange={(e) => set('companyName', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => set('type', e.target.value as VendorType)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => set('priority', e.target.value as VendorPriority)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {PRIORITY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Website</label>
              <Input
                type="url"
                placeholder="https://acmestaffing.com"
                value={form.website ?? ''}
                onChange={(e) => set('website', e.target.value || undefined)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Specializations
                <span className="ml-1 font-normal">(comma-separated)</span>
              </label>
              <Input
                placeholder="Software Engineering, Data Science, DevOps"
                value={domainsInput}
                onChange={(e) => setDomainsInput(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                rows={3}
                placeholder="Brief description of this vendor's strengths and focus areas…"
                value={form.description ?? ''}
                onChange={(e) => set('description', e.target.value || undefined)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Location ─────────────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">City</label>
                <Input
                  placeholder="New York"
                  value={form.city ?? ''}
                  onChange={(e) => set('city', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Country</label>
                <Input
                  placeholder="United States"
                  value={form.country ?? ''}
                  onChange={(e) => set('country', e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Primary contact ───────────────────────────────────────────── */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h3 className="text-sm font-medium">Primary contact <span className="text-xs font-normal text-muted-foreground">(optional)</span></h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Full name</label>
              <Input
                placeholder="Jane Smith"
                value={form.primaryContactName ?? ''}
                onChange={(e) => set('primaryContactName', e.target.value || undefined)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input
                  type="email"
                  placeholder="jane@acmestaffing.com"
                  value={form.primaryContactEmail ?? ''}
                  onChange={(e) => set('primaryContactEmail', e.target.value || undefined)}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input
                  placeholder="+1 555 000 0000"
                  value={form.primaryContactPhone ?? ''}
                  onChange={(e) => set('primaryContactPhone', e.target.value || undefined)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link href="/vendors">
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Cancel
            </Link>
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}
