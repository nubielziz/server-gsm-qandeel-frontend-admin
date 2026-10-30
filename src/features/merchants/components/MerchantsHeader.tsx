// MerchantsHeader: the page title with the active and waiting counts, and the Invite merchant button. Ports the `head` of
// pageMerchants in 42-p-merchants.js. The demo's "held in wallets" total is left out (no aggregate route, MISMATCHES M49).
import { Button, Icon, PageHeader } from '@/components/ui';
import type { MerchantGrants } from '../hooks/useMerchantGrants';

export interface MerchantsHeaderProps {
  grants: MerchantGrants;
  /** Counts from the server; undefined until they arrive (or when the role cannot read merchants). */
  active: number | undefined;
  pending: number | undefined;
  onInvite: () => void;
}

/** The page title, the counts under it and the Invite merchant button. */
export function MerchantsHeader({ grants, active, pending, onInvite }: MerchantsHeaderProps) {
  const lock = grants.needs('clients:create');
  const sub =
    active === undefined
      ? undefined
      : `${active} active${pending ? `, ${pending} waiting for approval` : ''}.`;
  return (
    <PageHeader
      title="Merchants"
      sub={sub}
      actions={
        <Button variant="primary" disabled={lock.disabled} title={lock.title} onClick={onInvite}>
          <Icon name="plus" className="ic-sm" />
          Invite merchant
        </Button>
      }
    />
  );
}
