'use client';

import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOrganization, useOrganizationSettings, useUpdateOrgProfile, useUpdateOrgSettings } from '@/hooks/use-organization';
import type { UpdateOrgProfileDto, UpdateOrgSettingsDto } from '@/types/settings';

// ── Organization Profile Section ───────────────────────────────────────────────

function OrganizationProfileSection() {
  const { data: org, isLoading, error } = useOrganization();
  const updateProfile = useUpdateOrgProfile();

  const [form, setForm] = useState<UpdateOrgProfileDto>({
    name: '',
    slug: '',
    domain: '',
    logoUrl: '',
  });

  useEffect(() => {
    if (org) {
      setForm({
        name:    org.name    ?? '',
        slug:    org.slug    ?? '',
        domain:  org.domain  ?? '',
        logoUrl: org.logoUrl ?? '',
      });
    }
  }, [org]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load organization profile.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dto: UpdateOrgProfileDto = {};
    if (form.name)    dto.name    = form.name;
    if (form.slug)    dto.slug    = form.slug;
    if (form.domain)  dto.domain  = form.domain;
    if (form.logoUrl) dto.logoUrl = form.logoUrl;
    updateProfile.mutate(dto);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>Basic information about your organization</CardDescription>
          </div>
          {org && (
            <Badge variant="secondary" className="capitalize">
              {org.plan}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Acme Corp"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-slug">Slug</Label>
            <Input
              id="org-slug"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="acme-corp"
            />
            <p className="text-xs text-muted-foreground">Used in URLs. Lowercase letters, numbers and hyphens only.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-domain">Domain</Label>
            <Input
              id="org-domain"
              value={form.domain ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="acme.com"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-logo">Logo URL</Label>
            <Input
              id="org-logo"
              value={form.logoUrl ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Workspace Settings Section ─────────────────────────────────────────────────

function WorkspaceSettingsSection() {
  const { data: settings, isLoading, error } = useOrganizationSettings();
  const updateSettings = useUpdateOrgSettings();

  const [form, setForm] = useState<UpdateOrgSettingsDto>({
    timezone:                   '',
    submissionStaleDays:        14,
    workflowStaleDays:          30,
    requireInterviewFeedback:   false,
    emailNotificationsEnabled:  true,
    inAppNotificationsEnabled:  true,
  });

  useEffect(() => {
    if (settings) {
      setForm({
        timezone:                  settings.timezone                  ?? '',
        submissionStaleDays:       settings.submissionStaleDays       ?? 14,
        workflowStaleDays:         settings.workflowStaleDays         ?? 30,
        requireInterviewFeedback:  settings.requireInterviewFeedback  ?? false,
        emailNotificationsEnabled: settings.emailNotificationsEnabled ?? true,
        inAppNotificationsEnabled: settings.inAppNotificationsEnabled ?? true,
      });
    }
  }, [settings]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">Failed to load workspace settings.</p>
        </CardContent>
      </Card>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(form);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
        <CardDescription>Configure defaults and notification preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="timezone">Timezone</Label>
            <Input
              id="timezone"
              value={form.timezone ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
              placeholder="America/New_York"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="submission-stale">Submission Stale Days</Label>
              <Input
                id="submission-stale"
                type="number"
                min={1}
                value={form.submissionStaleDays ?? 14}
                onChange={(e) =>
                  setForm((f) => ({ ...f, submissionStaleDays: parseInt(e.target.value, 10) || 14 }))
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="workflow-stale">Workflow Stale Days</Label>
              <Input
                id="workflow-stale"
                type="number"
                min={1}
                value={form.workflowStaleDays ?? 30}
                onChange={(e) =>
                  setForm((f) => ({ ...f, workflowStaleDays: parseInt(e.target.value, 10) || 30 }))
                }
              />
            </div>
          </div>

          <div className="grid gap-3">
            <p className="text-sm font-medium">Preferences</p>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={form.requireInterviewFeedback ?? false}
                onChange={(e) =>
                  setForm((f) => ({ ...f, requireInterviewFeedback: e.target.checked }))
                }
              />
              <span className="text-sm">Require interview feedback before advancing candidates</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={form.emailNotificationsEnabled ?? true}
                onChange={(e) =>
                  setForm((f) => ({ ...f, emailNotificationsEnabled: e.target.checked }))
                }
              />
              <span className="text-sm">Enable email notifications</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input accent-primary"
                checked={form.inAppNotificationsEnabled ?? true}
                onChange={(e) =>
                  setForm((f) => ({ ...f, inAppNotificationsEnabled: e.target.checked }))
                }
              />
              <span className="text-sm">Enable in-app notifications</span>
            </label>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateSettings.isPending}>
              {updateSettings.isPending
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Save Settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function OrganizationPage() {
  return (
    <div className="flex flex-col gap-6">
      <OrganizationProfileSection />
      <WorkspaceSettingsSection />
    </div>
  );
}
