'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface BulkConfirmDialogProps {
  open:          boolean;
  onOpenChange:  (open: boolean) => void;
  /** Headline, e.g. "Reject 12 submissions". */
  title:         string;
  /** Optional descriptive sentence under the title. */
  description?:  React.ReactNode;
  /** Label on the confirm button, e.g. "Reject". */
  confirmLabel?: string;
  /** Adds destructive styling + extra emphasis (red Confirm button). */
  destructive?:  boolean;
  /** True while the mutation is in flight; disables buttons + shows spinner. */
  loading?:      boolean;
  onConfirm:     () => void;
  /** Optional children for inline form fields (reason, target value, etc.). */
  children?:     React.ReactNode;
}

/**
 * Generic confirmation dialog for bulk operations. Pages compose it by
 * passing the operation title, optional inline form fields, and a
 * confirm handler that dispatches the mutation.
 *
 * The mutation owns its own success/error toasts via BulkResultToast;
 * this dialog just gates user intent.
 */
export function BulkConfirmDialog({
  open, onOpenChange, title, description,
  confirmLabel = 'Confirm', destructive = false, loading = false,
  onConfirm, children,
}: BulkConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !loading && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-4 w-4 text-destructive" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children && <div className="space-y-3 py-2">{children}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={cn(destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
