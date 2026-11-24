// CustomerSegment: the retail group of the audience (the wire's `customers`): every active account that holds a retail rank and every guest, or only those with a login
// or only guests, narrowed by country. A marketing campaign reaches only those who agreed to marketing, whatever is chosen here.
import { SegmentedControl, TextField } from '@/components/ui';
import { messagesUnder } from '../lib/serverErrors';
import type { CustomerAccounts } from '../lib/spec';
import { SegmentCard } from './SegmentCard';
import type { SegmentProps } from './StaffSegment';

const ACCOUNT_ITEMS: readonly { value: CustomerAccounts; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'accounts', label: 'With a login' },
  { value: 'guests', label: 'Guests' },
];

export function CustomerSegment({ audience, onChange, errors }: SegmentProps) {
  const { customers } = audience;
  const patch = (change: Partial<typeof customers>) =>
    onChange({ ...audience, customers: { ...customers, ...change } });
  return (
    <SegmentCard
      title="Retail"
      description="Retail accounts and guests of the storefront. A guest has no login, so gets email only."
      on={customers.on}
      onToggle={(on) => patch({ on })}
    >
      <div>
        <p className="label">Who</p>
        <SegmentedControl
          label="Retail accounts with a login or guests"
          items={ACCOUNT_ITEMS}
          value={customers.accounts}
          onChange={(accounts) => patch({ accounts })}
        />
      </div>
      <TextField
        label="Countries"
        hint="Two-letter codes separated by commas, such as JO, SA. Leave empty for every country."
        value={customers.countries}
        error={messagesUnder(errors, 'audience.customers.countries')}
        onChange={(event) => patch({ countries: event.target.value })}
      />
    </SegmentCard>
  );
}
