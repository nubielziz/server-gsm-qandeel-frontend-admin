// EmptyState: "nothing here" block that says what this is and what to do. Ports emptyBlock() of 20-ui.js.
import type { ReactNode } from 'react';
import { Icon, type IconName } from './Icon';

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  /** What the list is for and what to do next. */
  children?: ReactNode;
  /** Action buttons under the text. */
  cta?: ReactNode;
}

export function EmptyState({ icon = 'inbox', title, children, cta }: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-ink3">
        <Icon name={icon} />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {children && <p className="max-w-[48ch] text-sm text-ink2">{children}</p>}
      {cta && <div className="mt-1 flex flex-wrap justify-center gap-2">{cta}</div>}
    </div>
  );
}
