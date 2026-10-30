// RecoveryBadge and ConsentBadge: the word-and-icon badges of the Recovery and Consent columns. Ports recBadge of 51-p-checkouts.js
// and adds the consent badge the map's recovery rule needs (MISMATCHES M1).
import { Badge } from '@/components/ui';
import { RECOVERY_BADGE, type RecoveryState } from '../lib/recovery';

export function RecoveryBadge({ state }: { state: RecoveryState }) {
  const { tone, icon, label } = RECOVERY_BADGE[state];
  return (
    <Badge tone={tone} icon={icon}>
      {label}
    </Badge>
  );
}

/** Whether the customer agreed to marketing email. Both answers carry a word, never colour alone. */
export function ConsentBadge({ agreed }: { agreed: boolean }) {
  return agreed ? (
    <Badge tone="good" icon="check">
      Agreed
    </Badge>
  ) : (
    <Badge tone="neutral" icon="ban">
      Not agreed
    </Badge>
  );
}
