// PricingSection: one block of the Shop price rules view and of the publish start: a heading, a muted line under it, optional plain controls
// at its right (a filter, never the view's primary button, which sits in the pinned bar) and the content. The same look as the blocks of the
// Merchant price rules view: sections of one view, no card.
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/ui';

export interface PricingSectionProps {
  title: string;
  sub: string;
  right?: ReactNode;
  children: ReactNode;
}

/** A titled block of the view. */
export function PricingSection({ title, sub, right, children }: PricingSectionProps) {
  return (
    <section aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <SectionHeading>{title}</SectionHeading>
        {right}
      </div>
      <p className="hint mb-3">{sub}</p>
      {children}
    </section>
  );
}
