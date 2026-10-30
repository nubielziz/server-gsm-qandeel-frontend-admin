// PageStatusBadge: the status badge of a page (Published, Draft, Hidden from Google). Ports `lpBadge` of 50-p-storefront.js. A status
// is never colour alone: icon and word.
import { Badge } from '@/components/ui';
import { pageStatus } from '../lib/kinds';

/** The badge for a page's status. */
export function PageStatusBadge({ status }: { status: string }) {
  const shown = pageStatus(status);
  return (
    <Badge tone={shown.tone} icon={shown.icon}>
      {shown.label}
    </Badge>
  );
}
