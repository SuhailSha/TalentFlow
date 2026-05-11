'use client';

import { Loader2, Pencil, Plus, Shield, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from '@/hooks/use-roles';
import type { CreateRoleDto, RoleListItem, UpdateRoleDto } from '@/types/settings';

// ── Create / Edit Role Dialog ──────────────────────────────────────────────────

interface RoleDialogProps {
  role?: RoleListItem;
  onClose: () => void;
}

function RoleDialog({ role, onClose }: RoleDialogProps) {
  const isEdit = !!role;
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();

  const [form, setForm] = useState({
    name:        role?.name        ?? '',
    displayName: role?.displayName ?? '',
    description: role?.description ?? '',
    permissions: role?.permissions.join('\n') ?? '',
  });

  const isPending = createRole.isPending || updateRole.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const permissions = form.permissions
      .split('\n')
      .map((p) => p.trim())
      .filter(Boolean);

    if (isEdit && role) {
      const dto: UpdateRoleDto = {
        name:        form.name        || undefined,
        displayName: form.displayName || undefined,
        description: form.description || undefined,
        permissions: permissions.length ? permissions : undefined,
      };
      updateRole.mutate({ id: role.id, dto }, { onSuccess: onClose });
    } else {
      const dto: CreateRoleDto = {
        name:        form.name,
        displayName: form.displayName,
        description: form.description || undefined,
        permissions,
      };
      createRole.mutate(dto, { onSuccess: onClose });
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Edit Role' : 'Create Role'}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="role-name">Name *</Label>
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="recruiter"
            />
            <p className="text-xs text-muted-foreground">Internal identifier, no spaces</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="role-display">Display Name *</Label>
            <Input
              id="role-display"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="Recruiter"
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="role-desc">Description</Label>
          <Input
            id="role-desc"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="role-perms">Permissions</Label>
          <Textarea
            id="role-perms"
            value={form.permissions}
            onChange={(e) => setForm((f) => ({ ...f, permissions: e.target.value }))}
            placeholder="candidates:read&#10;candidates:write&#10;jobs:read"
            rows={5}
          />
          <p className="text-xs text-muted-foreground">One permission per line</p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            disabled={!form.name.trim() || !form.displayName.trim() || isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isEdit ? 'Save Changes' : 'Create Role'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ── Role Card ──────────────────────────────────────────────────────────────────

function RoleCard({ role, onEdit }: { role: RoleListItem; onEdit: (r: RoleListItem) => void }) {
  const deleteRole = useDeleteRole();

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium text-sm">{role.displayName}</span>
            {role.isSystem && (
              <Badge variant="secondary" className="text-[10px]">System</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground font-mono mb-2">{role.name}</p>
          {role.description && (
            <p className="text-xs text-muted-foreground mb-2">{role.description}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {role.permissions.slice(0, 8).map((perm) => (
              <Badge key={perm} variant="outline" className="text-[10px] font-mono">
                {perm}
              </Badge>
            ))}
            {role.permissions.length > 8 && (
              <Badge variant="outline" className="text-[10px]">
                +{role.permissions.length - 8} more
              </Badge>
            )}
            {role.permissions.length === 0 && (
              <span className="text-xs text-muted-foreground">No permissions</span>
            )}
          </div>
        </div>

        {!role.isSystem && (
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(role)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => deleteRole.mutate(role.id)}
              disabled={deleteRole.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const { data: roles, isLoading, error } = useRoles();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleListItem | undefined>();

  const systemRoles  = roles?.filter((r) => r.isSystem)  ?? [];
  const customRoles  = roles?.filter((r) => !r.isSystem) ?? [];

  const openCreate = () => { setEditingRole(undefined); setDialogOpen(true); };
  const openEdit   = (r: RoleListItem) => { setEditingRole(r); setDialogOpen(true); };
  const handleClose = () => { setDialogOpen(false); setEditingRole(undefined); };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <p className="py-6 text-sm text-destructive">Failed to load roles.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Roles &amp; Permissions</h2>
          <p className="text-sm text-muted-foreground">Control what each role can access</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      {/* System roles */}
      {systemRoles.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">System Roles</CardTitle>
            <CardDescription>Built-in roles that cannot be modified or deleted</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {systemRoles.map((role) => (
              <RoleCard key={role.id} role={role} onEdit={openEdit} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Custom roles */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Custom Roles</CardTitle>
          <CardDescription>Roles you created for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {customRoles.length === 0 ? (
            <div className="py-10 text-center">
              <Shield className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">No custom roles yet.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create your first role
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {customRoles.map((role) => (
                <RoleCard key={role.id} role={role} onEdit={openEdit} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
        {dialogOpen && <RoleDialog role={editingRole} onClose={handleClose} />}
      </Dialog>
    </div>
  );
}
