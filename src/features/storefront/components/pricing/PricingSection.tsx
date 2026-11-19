// PricingSection: one block of the Retail pricing tab: a title, a muted line, optional actions on the right and the content under
// it. The same look as the Rules and groups tab of the services page: blocks sit in one panel and are split by hairlines.
import type { ReactNode } from 'react';

export interface PricingSectionProps {
  title: string;
  sub: string;
  right?: ReactNode;
  children: ReactNode;
}

/** A titled block of the tab. */
export function PricingSection({ title, sub, right, children }: PricingSectionProps) {
  return (
    <section aria-label={title}>
      <div className="panel-h !border-b-0">
        <div className="flex-1">
          <h2 className="panel-t">{title}</h2>
          <p className="panel-s">{sub}</p>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}
