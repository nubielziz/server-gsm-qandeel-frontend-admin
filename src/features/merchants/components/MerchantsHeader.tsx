// MerchantsHeader: the page title with the active count, and the Invite merchant button. Ports the `head` of
// pageMerchants in 42-p-merchants.js. The demo's "held in wallets" total is left out (no aggregate route, MISMATCHES M49).
import { Button, Icon, PageHeader } from '@/components/ui';
import type { MerchantGrants } from '../hooks/useMerchantGrants';

export interface MerchantsHeaderProps {
  grants: MerchantGrants;
  /** The active count from the server; undefined until it arrives (or when the role cannot read merchants). */
  active: number | undefined;
  onInvite: () => void;
}

/** The page title, the active count under it and the Invite merchant button. */
export function MerchantsHeader({ grants, active, onInvite }: MerchantsHeaderProps) {
  const lock = grants.needs('clients:create');
  const sub = active === undefined ? undefined : `${active} active.`;
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
