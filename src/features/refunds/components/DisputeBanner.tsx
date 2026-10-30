// DisputeBanner: the sentence at the top of the dispute dialog that says where the case stands. Ports the `outcome` and the
// deadline notice of the dp-open dialog in 53-p-refunds.js: won, lost, with the card network, or evidence due (critical colour
// inside three days). The fee and amounts are the server's.
import type { ReactNode } from 'react';
import { cx, Icon, type IconName } from '@/components/ui';
import { ageText, ago, money, money0 } from '@/lib/format';
import { isUrgent, msLeft } from '../lib/deadline';
import type { Dispute } from '../types';

function Notice({ icon, tone, children }: { icon: IconName; tone: string; children: ReactNode }) {
  return (
    <p className={cx('flex gap-2 rounded-md p-2.5 text-sm', tone)}>
      <Icon name={icon} className="ic-sm mt-0.5 flex-none" />
      <span>{children}</span>
    </p>
  );
}

export function DisputeBanner({ dispute, now }: { dispute: Dispute; now: number }) {
  const fee = money0(dispute.fee);
  switch (dispute.status) {
    case 'won':
      return (
        <Notice icon="checkCircle" tone="bg-good-bg text-good-fg">
          Won. The bank accepted the proof and kept the payment. The {fee} fee stays with the gateway.
        </Notice>
      );
    case 'lost':
      return (
        <Notice icon="xCircle" tone="bg-crit-bg text-crit-fg">
          Lost. {money(dispute.amount)} and the {fee} fee were taken back.
        </Notice>
      );
    case 'under_review':
      return (
        <Notice icon="clock" tone="bg-sunken text-ink2">
          Evidence sent {ago(dispute.submittedAt, now)}. The card network decides in 30 to 75 days. Nothing
          more to do.
        </Notice>
      );
    default: {
      const left = msLeft(dispute.evidenceDueAt, now);
      const tone = isUrgent(dispute.evidenceDueAt, now)
        ? 'bg-crit-bg text-crit-fg'
        : 'bg-warn-bg text-warn-fg';
      return (
        <Notice icon="clock" tone={tone}>
          {left !== null && left > 0 ? (
            <>
              Evidence is due in <strong>{ageText(left)}</strong>.
            </>
          ) : (
            'The evidence deadline has passed.'
          )}{' '}
          Winning keeps {money(dispute.amount)}; losing costs that plus a {fee} fee.
        </Notice>
      );
    }
  }
}
