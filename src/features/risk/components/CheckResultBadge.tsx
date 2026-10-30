// CheckResultBadge: the result of an IMEI check as a badge with an icon and a word (the demo's `CHECK_RESULT` badge).
import { Badge } from '@/components/ui';
import { resultBadge } from '../lib/labels';

export function CheckResultBadge({ status }: { status: string }) {
  const badge = resultBadge(status);
  return (
    <Badge tone={badge.tone} icon={badge.icon}>
      {badge.label}
    </Badge>
  );
}
