// RuleSection: one block of the Merchant price rules view: a heading, a muted line under it, optional plain controls at its right (a link, never
// the view's primary button, which sits in the pinned bar) and the content. Ports the `panel-h` header of each block in rulesTab
// (43-p-services.js) without the card: the blocks are sections of one view, split by space.
import type { ReactNode } from 'react';
import { SectionHeading } from '@/components/ui';

export interface RuleSectionProps {
  title: string;
  sub: string;
  /** A plain control beside the heading (a link). */
  right?: ReactNode;
  children: ReactNode;
}

/** A titled block of the view. */
export function RuleSection({ title, sub, right, children }: RuleSectionProps) {
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
