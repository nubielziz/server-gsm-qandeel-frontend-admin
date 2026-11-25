// PageButtonLink: a small button-styled link to another console page, shown only when the staff member may open that page.
// Ports the demo's `data-act="go"` buttons; the demo had no permissions, the console hides a button that would end on "no access".
import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/ui';
import { useMe } from '@/features/auth';
import { canUseView, viewSpec } from '@/features/money';
import { useCanOpenPage } from '@/lib/auth/useCanOpenPage';
import type { PageTarget } from '../lib/links';

/**
 * Renders nothing while the access check runs and when the page is closed to the staff member (a hint; the page checks again). A
 * target into a Money view also needs that view: the Money page opens for many permissions, so the page check alone is too wide.
 */
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
  const { data: me } = useMe();
  // Until `me` is known the permissions are unknown too, so a view link stays hidden.
  const canUseTargetView =
    target.view === undefined || (me !== undefined && canUseView(viewSpec(target.view), me.permissions));
  if (!canOpen || !canUseTargetView) return null;
  return (
    <ButtonLink size="sm" to={target.to} className={className}>
      {children}
    </ButtonLink>
  );
}
