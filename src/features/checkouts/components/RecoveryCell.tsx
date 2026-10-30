// RecoveryCell: the Recovery column. The demo's badge, plus when the email went out, or for a customer without marketing consent
// the reason there is no email and no button (the map's rule, MISMATCHES M1).
import { ago } from '@/lib/format';
import { NO_CONSENT_NOTE, recoveryState } from '../lib/recovery';
import type { AbandonedCheckout } from '../types';
import { RecoveryBadge } from './RecoveryBadge';

export interface RecoveryCellProps {
  checkout: AbandonedCheckout;
  /** From `useNow`, so every age on the page moves together. */
  now: number;
}

export function RecoveryCell({ checkout, now }: RecoveryCellProps) {
  const state = recoveryState(checkout);
  return (
    <>
      <RecoveryBadge state={state} />
      {checkout.recoveryEmailedAt && (
        <p className="mt-0.5 text-2xs text-ink3">Emailed {ago(checkout.recoveryEmailedAt, now)}</p>
      )}
      {state === 'no_consent' && <p className="mt-0.5 text-2xs text-ink3">{NO_CONSENT_NOTE}</p>}
    </>
  );
}
