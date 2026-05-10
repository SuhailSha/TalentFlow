'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
  User,
} from 'lucide-react';

import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useAddVendorContact,
  useAddVendorNote,
  useDeleteVendor,
  useRemoveVendorContact,
  useTransitionVendorStatus,
  useVendor,
} from '@/hooks/use-vendors';
import type {
  CreateVendorContactDto,
  VendorContactView,
  VendorNoteView,
  VendorStatus,
} from '@/types/vendors';

// ── Status display ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<VendorStatus, string> = {
  PROSPECT: 'bg-purple-100 text-purple-800',
  ACTIVE:   'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-700',
  BLOCKED:  'bg-red-100 text-red-800',
  ARCHIVED: 'bg-gray-100 text-gray-400',
};

const STATUS_TRANSITIONS: Record<VendorStatus, { label: string; target: VendorStatus }[]> = {
  PROSPECT: [{ label: 'Activate',  target: 'ACTIVE'   }, { label: 'Block', target: 'BLOCKED' }],
  ACTIVE:   [{ label: 'Mark inactive', target: 'INACTIVE' }, { label: 'Block', target: 'BLOCKED' }],
  INACTIVE: [{ label: 'Reactivate', target: 'ACTIVE'  }, { label: 'Block', target: 'BLOCKED' }],
  BLOCKED:  [{ label: 'Archive',   target: 'ARCHIVED' }],
  ARCHIVED: [],
};

const NOTE_TYPE_LABELS: Record<string, string> = {
  NOTE:          'Note',
  CALL:          'Call',
  EMAIL:         'Email',
  MEETING:       'Meeting',
  STATUS_CHANGE: 'Status change',
  SYSTEM:        'System',
};

// ── Contact card ───────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onRemove,
}: {
  contact: VendorContactView;
  onRemove: (id: string) => void;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-1 ${contact.isPrimary ? 'border-primary/30 bg-primary/5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">{contact.fullName}</span>
          {contact.isPrimary && (
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          )}
          {!contact.isActive && (
            <Badge variant="secondary" className="text-xs">Inactive</Badge>
          )}
        </div>
        <button
          onClick={() => onRemove(contact.id)}
          className="text-muted-foreground hover:text-destructive transition-colors"
          title="Remove contact"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {contact.title && <p className="text-xs text-muted-foreground">{contact.title}</p>}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-foreground">
          <Mail className="h-3 w-3" /> {contact.email}
        </a>
        {contact.phone && (
          <a href={`tel:${contact.phone}`} className="flex items-center gap-1 hover:text-foreground">
            <Phone className="h-3 w-3" /> {contact.phone}
          </a>
        )}
      </div>
    </div>
  );
}

// ── Add contact form ───────────────────────────────────────────────────────────

function AddContactForm({
  vendorId,
  onDone,
}: {
  vendorId: string;
  onDone: () => void;
}) {
  const [form, setForm] = useState<CreateVendorContactDto>({
    firstName: '',
    lastName: '',
    email: '',
    isPrimary: false,
  });
  const { mutate, isPending } = useAddVendorContact(vendorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate(form, { onSuccess: onDone });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-3 bg-muted/30">
      <div className="grid grid-cols-2 gap-2">
        <input
          required
          placeholder="First name"
          value={form.firstName}
          onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <input
          required
          placeholder="Last name"
          value={form.lastName}
          onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <input
        required
        type="email"
        placeholder="Email"
        value={form.email}
        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <input
        placeholder="Phone (optional)"
        value={form.phone ?? ''}
        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value || undefined }))}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <input
          type="checkbox"
          checked={form.isPrimary}
          onChange={(e) => setForm((f) => ({ ...f, isPrimary: e.target.checked }))}
          className="rounded"
        />
        Set as primary contact
      </label>
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add contact'}
        </Button>
      </div>
    </form>
  );
}

// ── Note entry ─────────────────────────────────────────────────────────────────

function NoteEntry({ note }: { note: VendorNoteView }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <Badge variant="outline" className="text-xs mr-1.5">
            {NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
          </Badge>
          {note.authorEmail ?? 'System'}
        </span>
        <span>{new Date(note.createdAt).toLocaleString()}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{note.content}</p>
    </div>
  );
}

// ── Add note form ──────────────────────────────────────────────────────────────

function AddNoteForm({ vendorId }: { vendorId: string }) {
  const [content, setContent] = useState('');
  const { mutate, isPending }  = useAddVendorNote(vendorId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutate({ content }, { onSuccess: () => setContent('') });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <textarea
        rows={3}
        placeholder="Add a note…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !content.trim()}>
          {isPending ? 'Saving…' : 'Add note'}
        </Button>
      </div>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showAddContact, setShowAddContact] = useState(false);

  const { data: vendor, isLoading, isError } = useVendor(id);
  const { mutate: deleteVendor, isPending: isDeleting } = useDeleteVendor();
  const { mutate: transition, isPending: isTransitioning } = useTransitionVendorStatus(id);
  const { mutate: removeContact } = useRemoveVendorContact(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-64" />
          </div>
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium">Vendor not found</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/vendors">Back to vendors</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const transitions = STATUS_TRANSITIONS[vendor.status] ?? [];

  const handleDelete = () => {
    if (!confirm(`Delete "${vendor.companyName}"? This cannot be undone.`)) return;
    deleteVendor(id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={vendor.companyName}
        description={vendor.vendorCode ?? undefined}
        breadcrumbs={[
          { title: 'Dashboard', href: '/dashboard' },
          { title: 'Vendors', href: '/vendors' },
          { title: vendor.companyName },
        ]}
        actions={
          <div className="flex gap-2">
            {transitions.length > 0 && (
              <div className="relative group">
                <Button variant="outline" size="sm" disabled={isTransitioning}>
                  Change status <ChevronDown className="ml-1 h-3 w-3" />
                </Button>
                <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-10 min-w-36 rounded-lg border bg-popover shadow-md py-1">
                  {transitions.map(({ label, target }) => (
                    <button
                      key={target}
                      onClick={() => transition(target)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <Button asChild variant="outline" size="sm">
              <Link href={`/vendors/${id}/edit`}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main column ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Overview card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Status + priority badges */}
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[vendor.status]}`}>
                  {vendor.status}
                </span>
                {vendor.priority !== 'NORMAL' && (
                  <Badge variant="outline" className="text-xs">{vendor.priority}</Badge>
                )}
                <Badge variant="secondary" className="text-xs">{vendor.type.replace(/_/g, ' ')}</Badge>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {vendor.website && (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.website}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                )}
                {vendor.location && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>{vendor.location}</span>
                  </div>
                )}
                {vendor.primaryContactEmail && (
                  <a
                    href={`mailto:${vendor.primaryContactEmail}`}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.primaryContactEmail}</span>
                  </a>
                )}
                {vendor.primaryContactPhone && (
                  <a
                    href={`tel:${vendor.primaryContactPhone}`}
                    className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{vendor.primaryContactPhone}</span>
                  </a>
                )}
              </div>

              {/* Domains */}
              {vendor.domains.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {vendor.domains.map((d) => (
                    <Badge key={d} variant="secondary" className="text-xs">{d}</Badge>
                  ))}
                </div>
              )}

              {/* Description */}
              {vendor.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {vendor.description}
                </p>
              )}

              {/* Business terms */}
              {(vendor.commissionRate !== null || vendor.paymentTermsDays !== null) && (
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground border-t pt-3">
                  {vendor.commissionRate !== null && (
                    <span>Commission: {vendor.commissionRate}%</span>
                  )}
                  {vendor.paymentTermsDays !== null && (
                    <span>Payment terms: Net {vendor.paymentTermsDays}</span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddNoteForm vendorId={id} />
              {vendor.notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notes yet.</p>
              ) : (
                <div className="space-y-4 divide-y">
                  {vendor.notes.map((n) => (
                    <div key={n.id} className="pt-4 first:pt-0">
                      <NoteEntry note={n} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar column ───────────────────────────────────────────────── */}
        <div className="space-y-6">

          {/* Contacts card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  <User className="inline h-3.5 w-3.5 mr-1" />
                  Contacts
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddContact((v) => !v)}
                  className="h-7 px-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showAddContact && (
                <AddContactForm
                  vendorId={id}
                  onDone={() => setShowAddContact(false)}
                />
              )}
              {vendor.contacts.length === 0 && !showAddContact ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No contacts yet.
                </p>
              ) : (
                vendor.contacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onRemove={(cid) => {
                      if (confirm(`Remove ${c.fullName}?`)) removeContact(cid);
                    }}
                  />
                ))
              )}
            </CardContent>
          </Card>

          {/* Meta card */}
          <Card>
            <CardContent className="pt-4 space-y-2 text-xs text-muted-foreground">
              {vendor.activatedAt && (
                <div className="flex justify-between">
                  <span>Activated</span>
                  <span>{new Date(vendor.activatedAt).toLocaleDateString()}</span>
                </div>
              )}
              {vendor.lastContactedAt && (
                <div className="flex justify-between">
                  <span>Last contacted</span>
                  <span>{new Date(vendor.lastContactedAt).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Created</span>
                <span>{new Date(vendor.createdAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
