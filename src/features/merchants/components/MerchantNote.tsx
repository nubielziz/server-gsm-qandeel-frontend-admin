// MerchantNote: the banner under the page header that says why a merchant cannot order: "Waiting for approval" (with the state of
// their verification) or "Suspended" (with the reason, who and when, from the server). Ports the `pendingNote` of pageMerchant in
// 42-p-merchants.js.
import type { ReactNode } from 'react';
import { Icon, type IconName } from '@/components/ui';
import { ago } from '@/lib/format';
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
  children: ReactNode;
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

// "Reason: Chargeback dispute · by Rami K. · 6d ago", leaving out what the server did not say.
function suspensionLine(suspension: Client['suspension'], now: number): string | undefined {
  if (!suspension) return undefined;
  const parts = [
    suspension.reason ? `Reason: ${suspension.reason}` : undefined,
    suspension.by ? `by ${suspension.by.name}` : undefined,
    suspension.at ? ago(suspension.at, now) : undefined,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

/**
 * Shows why a pending or suspended merchant cannot order, or nothing for an active one. `now` moves the age with the page's clock
 * (a test can fix it).
 */
export function MerchantNote({
  client,
  now = Date.now(),
}: {
  client: Pick<Client, 'status' | 'kycStatus' | 'suspension'>;
  now?: number;
}) {
  if (client.status === 'pending') {
    const kyc = Object.hasOwn(KYC_WORDS, client.kycStatus) ? KYC_WORDS[client.kycStatus] : client.kycStatus;
    return (
      <Note tone="warn" icon="clock" title="Waiting for approval">
        {`KYC is ${kyc}. The merchant cannot place orders until you approve the account.`}
      </Note>
    );
  }
  if (client.status === 'suspended') {
    const line = suspensionLine(client.suspension, now);
    return (
      <Note tone="crit" icon="ban" title="Suspended">
        <>
          Sign-in and API calls are refused. Open orders continue.
          {line && <span className="block">{line}</span>}
        </>
      </Note>
    );
  }
  return null;
}
