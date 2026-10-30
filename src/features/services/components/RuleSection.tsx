// RuleSection: one block of the Rules and groups tab: a title, a muted line, optional actions on the right and the content under
// it. Ports the `panel-h` header of each block in rulesTab (43-p-services.js). The blocks sit inside the page's panel and are split
// by hairlines, because panels are never nested.
import type { ReactNode } from 'react';

export interface RuleSectionProps {
  title: string;
  sub: string;
  right?: ReactNode;
  children: ReactNode;
}

export function RuleSection({ title, sub, right, children }: RuleSectionProps) {
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
