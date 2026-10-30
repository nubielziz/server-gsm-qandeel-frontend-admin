// PageButtonLink: a small button-styled link to another console page, shown only when the staff member may open that page.
// Ports the demo's `data-act="go"` buttons; the demo had no permissions, the console hides a button that would end on "no access".
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import type { PageTarget } from '../lib/links';

/** Renders nothing while the access check runs and when the page is closed to the staff member (a hint; the page checks again). */
export function PageButtonLink({
  target,
  className,
  children,
}: {
  target: PageTarget;
  className?: string;
  children: ReactNode;
}) {
  const canOpen = useCanOpenPage(target.page);
  if (!canOpen) return null;
  return (
    <ButtonLink size="sm" to={target.to} className={className}>
      {children}
    </ButtonLink>
  );
}
