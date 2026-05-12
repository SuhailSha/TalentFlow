'use client';

import { useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

interface SelectionCheckboxProps {
  checked:         boolean;
  /** Header checkboxes set this true to show the partial-select state. */
  indeterminate?:  boolean;
  onChange:        (checked: boolean) => void;
  disabled?:       boolean;
  /** Visual size tweak. `sm` for row checkboxes, `md` for headers. */
  size?:           'sm' | 'md';
  'aria-label'?:   string;
  className?:      string;
  /**
   * Stops click event propagation to a parent <Link> so clicking the
   * checkbox doesn't trigger row navigation. Default true.
   */
  stopPropagation?: boolean;
}

/**
 * Styled native checkbox. Native because the project doesn't have a Radix
 * primitive for it and we don't need the form-control complexity of one —
 * a row checkbox is one boolean.
 *
 * Use `stopPropagation` (default true) inside table rows that are wrapped
 * in `<Link>` or have an onClick handler, so the checkbox is operable
 * without firing the row's navigation behavior.
 */
export function SelectionCheckbox({
  checked,
  indeterminate = false,
  onChange,
  disabled = false,
  size = 'sm',
  className,
  stopPropagation = true,
  ...rest
}: SelectionCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);

  // The HTML indeterminate state is a property, not an attribute — must be
  // set imperatively.
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      onClick={(e) => { if (stopPropagation) e.stopPropagation(); }}
      disabled={disabled}
      className={cn(
        'shrink-0 cursor-pointer rounded border-input text-primary accent-primary focus:ring-2 focus:ring-ring focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-4 w-4' : 'h-5 w-5',
        className,
      )}
      aria-label={rest['aria-label']}
    />
  );
}
