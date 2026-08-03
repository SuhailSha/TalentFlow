'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

// ─── Card variants ─────────────────────────────────────────────────────────
// Three canonical surfaces from the Phase 0A blueprint.
//   - flat      → KPI tiles, inline summaries (no border / shadow)
//   - bordered  → DEFAULT. Form cards, workspace sections, list rows
//   - elevated  → popovers, drawers, command bar, dropdowns
//
// `padding` controls the inner padding used by CardHeader/Content/Footer.

const cardVariants = cva(
  'bg-card text-card-foreground transition-colors',
  {
    variants: {
      variant: {
        flat:      'rounded-lg',
        bordered:  'rounded-lg border border-border',
        elevated:  'rounded-xl border border-border shadow-lg',
      },
      padding: {
        default: '',  // sub-components own padding
        none:    '',
      },
    },
    defaultVariants: {
      variant: 'bordered',
      padding: 'default',
    },
  },
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div ref={ref} className={cn(cardVariants({ variant, padding, className }))} {...props} />
  ),
);
Card.displayName = 'Card';

// ─── Sub-components ────────────────────────────────────────────────────────
// Header / Content / Footer keep their existing API but use the
// design-system padding scale (16 / 20 / 24).

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col space-y-1.5 px-5 pt-4 pb-3', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-h2 leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h3>
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-body-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('px-5 pb-5', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center px-5 pb-5 pt-0', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
