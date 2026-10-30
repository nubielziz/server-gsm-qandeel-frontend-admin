// StatusBadge: the word, icon and tone of a log status (sent, failed, delivered…). Status is never colour alone.
import { Badge } from '@/components/ui';
import type { StatusLook } from '../lib/logs';

/** A badge for a status look from `lib/logs.ts`. */
export function StatusBadge({ look }: { look: StatusLook }) {
  return (
    <Badge tone={look.tone} icon={look.icon}>
      {look.label}
    </Badge>
  );
}
