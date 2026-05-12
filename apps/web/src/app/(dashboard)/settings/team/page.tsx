'use client';

import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, CheckCircle2, Clock, Loader2, Mail, RefreshCw, UserPlus, XCircle } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useActivateUser,
  useDeactivateUser,
  useInvitations,
  useInviteUser,
  useResendInvitation,
  useRevokeInvitation,
  useUsers,
} from '@/hooks/use-users-mgmt';
import {
  INVITATION_STATUS_LABELS,
  USER_STATUS_LABELS,
  type EmailDeliveryStatus,
  type EmailDeliverySummary,
  type InvitationStatus,
  type InviteUserDto,
  type UserStatus,
} from '@/types/settings';
import { cn } from '@/lib/utils';

// ── Status badge variants ──────────────────────────────────────────────────────

const userStatusVariant: Record<UserStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  ACTIVE:               'default',
  PENDING_VERIFICATION: 'secondary',
  SUSPENDED:            'destructive',
  DEACTIVATED:          'outline',
};

const invStatusVariant: Record<InvitationStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PENDING:  'secondary',
  ACCEPTED: 'default',
  EXPIRED:  'outline',
  REVOKED:  'destructive',
};

// ── Delivery status pill ───────────────────────────────────────────────────────

const DELIVERY_TONE: Record<EmailDeliveryStatus, string> = {
  PENDING:  'bg-gray-100 text-gray-700',
  QUEUED:   'bg-blue-100 text-blue-700',
  RETRYING: 'bg-amber-100 text-amber-700',
  SENT:     'bg-green-100 text-green-700',
  FAILED:   'bg-red-100 text-red-700',
  BOUNCED:  'bg-red-100 text-red-700',
  SKIPPED:  'bg-gray-100 text-gray-600',
};

function DeliveryPill({ delivery }: { delivery: EmailDeliverySummary | null | undefined }) {
  if (!delivery) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
        <Clock className="h-3 w-3" />
        No email
      </span>
    );
  }
  const Icon =
    delivery.status === 'SENT' ? CheckCircle2 :
    delivery.status === 'FAILED' || delivery.status === 'BOUNCED' ? AlertTriangle :
    delivery.status === 'RETRYING' ? RefreshCw :
    delivery.status === 'SKIPPED' ? XCircle :
    Clock;
  const titleParts = [
    `Status: ${delivery.status}`,
    delivery.attempts > 0 ? `Attempts: ${delivery.attempts}` : null,
    delivery.sentAt ? `Sent: ${new Date(delivery.sentAt).toLocaleString()}` : null,
    delivery.failureReason ? `Reason: ${delivery.failureReason}` : null,
    `Provider: ${delivery.provider}`,
  ].filter(Boolean).join(' • ');
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        DELIVERY_TONE[delivery.status],
      )}
      title={titleParts}
    >
      <Icon className="h-3 w-3" />
      {delivery.status}
    </span>
  );
}

// ── Invite Member Dialog ───────────────────────────────────────────────────────

function InviteMemberDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<InviteUserDto>({ email: '', firstName: '', lastName: '' });
  const invite = useInviteUser();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim() || !form.firstName.trim() || !form.lastName.trim()) return;
    invite.mutate(form, { onSuccess: onClose });
  };

  return (
    <DialogContent className="sm:max-w-[420px]">
      <DialogHeader>
        <DialogTitle>Invite Team Member</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid gap-1.5">
          <Label htmlFor="invite-email">Email *</Label>
          <Input
            id="invite-email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="colleague@company.com"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="invite-first">First Name *</Label>
            <Input
              id="invite-first"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              placeholder="Jane"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-last">Last Name *</Label>
            <Input
              id="invite-last"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              placeholder="Smith"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={!form.email.trim() || !form.firstName.trim() || !form.lastName.trim() || invite.isPending}
          >
            {invite.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
            Send Invite
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ── Members Tab ────────────────────────────────────────────────────────────────

function MembersTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useUsers({ page, limit: 20 });
  const activate   = useActivateUser();
  const deactivate = useDeactivateUser();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-6 text-sm text-destructive">Failed to load team members.</p>;
  }

  const users = data?.data ?? [];
  const meta  = data?.meta;

  return (
    <div className="flex flex-col gap-4">
      {users.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No team members found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role(s)</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Login</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {user.firstName} {user.lastName}
                    {user.title && (
                      <span className="ml-1 text-xs text-muted-foreground">— {user.title}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.userRoles.map(({ role }) => (
                        <Badge key={role.id} variant="outline" className="text-[10px]">
                          {role.displayName}
                        </Badge>
                      ))}
                      {user.userRoles.length === 0 && (
                        <span className="text-xs text-muted-foreground">No roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={userStatusVariant[user.status]}>
                      {USER_STATUS_LABELS[user.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.status === 'ACTIVE' || user.status === 'PENDING_VERIFICATION' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => deactivate.mutate(user.id)}
                        disabled={deactivate.isPending}
                      >
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => activate.mutate(user.id)}
                        disabled={activate.isPending}
                      >
                        Activate
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {meta.page} of {meta.totalPages} &middot; {meta.total} members
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={!meta.hasPreviousPage}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!meta.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Invitations Tab ────────────────────────────────────────────────────────────

function InvitationsTab() {
  const { data: invitations, isLoading, error } = useInvitations();
  const revoke = useRevokeInvitation();
  const resend = useResendInvitation();
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [revokingId,  setRevokingId]  = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-6 text-sm text-destructive">Failed to load invitations.</p>;
  }

  if (!invitations || invitations.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">No invitations found.</p>;
  }

  const handleResend = (id: string) => {
    setResendingId(id);
    resend.mutate(id, { onSettled: () => setResendingId(null) });
  };
  const handleRevoke = (id: string) => {
    setRevokingId(id);
    revoke.mutate(id, { onSettled: () => setRevokingId(null) });
  };

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email delivery</th>
            <th className="px-4 py-3 text-left font-medium text-muted-foreground">Expires</th>
            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invitations.map((inv) => {
            const canActOnInvitation = inv.status === 'PENDING' || inv.status === 'EXPIRED';
            return (
              <tr key={inv.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">{inv.email}</td>
                <td className="px-4 py-3">{inv.firstName} {inv.lastName}</td>
                <td className="px-4 py-3">
                  <Badge variant={invStatusVariant[inv.status]}>
                    {INVITATION_STATUS_LABELS[inv.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <DeliveryPill delivery={inv.lastDelivery} />
                    {inv.lastDelivery?.failureReason && (
                      <span className="max-w-[18ch] truncate text-[10px] text-red-700" title={inv.lastDelivery.failureReason}>
                        {inv.lastDelivery.failureReason}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    {canActOnInvitation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleResend(inv.id)}
                        disabled={resendingId === inv.id}
                      >
                        {resendingId === inv.id
                          ? <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          : <RefreshCw className="mr-1 h-3 w-3" />}
                        Resend
                      </Button>
                    )}
                    {inv.status === 'PENDING' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleRevoke(inv.id)}
                        disabled={revokingId === inv.id}
                      >
                        Revoke
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Team Members</h2>
          <p className="text-sm text-muted-foreground">Manage who has access to your workspace</p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Member
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['members', 'invitations'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'members' ? 'Members' : 'Invitations'}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground capitalize">
            {activeTab}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeTab === 'members' ? <MembersTab /> : <InvitationsTab />}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <InviteMemberDialog onClose={() => setInviteOpen(false)} />
      </Dialog>
    </div>
  );
}
