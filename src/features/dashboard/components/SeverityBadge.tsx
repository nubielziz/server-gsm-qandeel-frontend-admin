// SeverityBadge: the Critical / High / Medium / Low badge at the start of each "Needs attention" row. Ports the ATTN badges of
// 40-p-dashboard.js; critical is the one solid fill of the system.
import { Badge } from '@/components/ui';
import { severityLook } from '../lib/labels';

/** The badge for a severity word from the server; a word this console does not know looks like Low. */
export function SeverityBadge({ severity }: { severity: string }) {
  const look = severityLook(severity);
  return (
    <Badge tone={look.tone} icon={look.icon} solid={look.solid}>
      {look.word}
    </Badge>
  );
}
