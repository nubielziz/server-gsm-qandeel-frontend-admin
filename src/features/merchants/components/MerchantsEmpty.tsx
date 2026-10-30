// MerchantsEmpty: what the table says when there are no rows: no merchants yet, nothing matches the filters, or an empty tab.
// Ports the `empty` pair of pageMerchants in 42-p-merchants.js, with a line for the tabs that name one status.
import { Button, EmptyState, Icon } from '@/components/ui';
import type { MerchantTab } from '../lib/status';

export interface MerchantsEmptyProps {
  tab: MerchantTab;
  filtersOn: boolean;
  /** No merchant exists at all (the "All" count is zero). */
  noMerchants: boolean;
  /** The Invite merchant button's state, so the call to action is disabled with its reason like the header's. */
  invite: { disabled: boolean; title?: string };
  onInvite: () => void;
  onClear: () => void;
}

const TAB_NOTE: Partial<Record<MerchantTab, { title: string; body: string }>> = {
  pending: {
    title: 'Nobody is waiting for approval',
    body: 'New sign-ups and invited merchants appear here until you approve them.',
  },
  active: { title: 'No active merchants', body: 'Merchants appear here once you approve their account.' },
  suspended: {
    title: 'No suspended merchants',
    body: 'A merchant you suspend appears here until you reactivate them.',
  },
};

/** Says why the table has no rows and what to do about it. */
export function MerchantsEmpty({
  tab,
  filtersOn,
  noMerchants,
  invite,
  onInvite,
  onClear,
}: MerchantsEmptyProps) {
  if (noMerchants) {
    return (
      <EmptyState
        icon="users"
        title="No merchants yet"
        cta={
          <Button variant="primary" disabled={invite.disabled} title={invite.title} onClick={onInvite}>
            <Icon name="plus" className="ic-sm" />
            Invite merchant
          </Button>
        }
      >
        Invite a reseller or repair shop. They get a wallet, an API key and a price group, and can start
        ordering after you approve the account.
      </EmptyState>
    );
  }
  const note = TAB_NOTE[tab];
  if (!filtersOn && note) {
    return (
      <EmptyState icon="users" title={note.title}>
        {note.body}
      </EmptyState>
    );
  }
  return (
    <EmptyState
      icon="filter"
      title="No merchants match"
      cta={filtersOn ? <Button onClick={onClear}>Clear filters</Button> : undefined}
    >
      Try another search or tab.
    </EmptyState>
  );
}
