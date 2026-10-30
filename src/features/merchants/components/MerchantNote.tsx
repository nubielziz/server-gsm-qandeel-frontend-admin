// MerchantNote: the banner under the page header that says why a merchant cannot order: "Waiting for approval" (with the state of
// their verification) or "Suspended". Ports the `pendingNote` of pageMerchant in 42-p-merchants.js.
import { Icon, type IconName } from '@/components/ui';
import { KYC_WORDS } from '../lib/status';
import type { Client } from '../types';

function Note({
  tone,
  icon,
  title,
  children,
}: {
  tone: 'warn' | 'crit';
  icon: IconName;
  title: string;
  children: string;
}) {
  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-lg p-3 text-sm ${tone === 'warn' ? 'bg-warn-bg text-warn-fg' : 'bg-crit-bg text-crit-fg'}`}
      role="note"
    >
      <Icon name={icon} className="mt-px" />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5">{children}</p>
      </div>
    </div>
  );
}

/** Shows why a pending or suspended merchant cannot order, or nothing for an active one. */
export function MerchantNote({ client }: { client: Pick<Client, 'status' | 'kycStatus'> }) {
  if (client.status === 'pending') {
    const kyc = Object.hasOwn(KYC_WORDS, client.kycStatus) ? KYC_WORDS[client.kycStatus] : client.kycStatus;
    return (
      <Note tone="warn" icon="clock" title="Waiting for approval">
        {`KYC is ${kyc}. The merchant cannot place orders until you approve the account.`}
      </Note>
    );
  }
  if (client.status === 'suspended') {
    return (
      <Note tone="crit" icon="ban" title="Suspended">
        API calls return an error and the portal is read-only. Existing open orders continue.
      </Note>
    );
  }
  return null;
}
