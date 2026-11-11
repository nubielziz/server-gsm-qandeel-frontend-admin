// CustomerSegment: the customer group of the audience: all active customers, or only those with an account or guests, narrowed by country and by the
// language they read. A marketing campaign reaches only customers who agreed to marketing, whatever is chosen here.
import { CheckboxField, SegmentedControl, TextField } from '@/components/ui';
import { messagesUnder } from '../lib/serverErrors';
import type { CustomerAccounts } from '../lib/spec';
import type { CampaignLocale } from '../types';
import { SegmentCard } from './SegmentCard';
import type { SegmentProps } from './StaffSegment';

const ACCOUNT_ITEMS: readonly { value: CustomerAccounts; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'accounts', label: 'With an account' },
  { value: 'guests', label: 'Guests' },
];

export function CustomerSegment({ audience, onChange, errors }: SegmentProps) {
  const { customers } = audience;
  const patch = (change: Partial<typeof customers>) =>
    onChange({ ...audience, customers: { ...customers, ...change } });
  const toggleLocale = (locale: CampaignLocale, on: boolean) =>
    patch({
      locales: on
        ? [...customers.locales, locale]
        : customers.locales.filter((candidate) => candidate !== locale),
    });
  return (
    <SegmentCard
      title="Customers"
      description="Customers of the storefront. Guests have no account, so they get email only."
      on={customers.on}
      onToggle={(on) => patch({ on })}
    >
      <div>
        <p className="label">Customers</p>
        <SegmentedControl
          label="Customers with an account or guests"
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
      <fieldset className="min-w-0">
        <legend className="label">Language they read</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          <CheckboxField
            label="English"
            checked={customers.locales.includes('en')}
            onChange={(event) => toggleLocale('en', event.target.checked)}
          />
          <CheckboxField
            label="العربية"
            checked={customers.locales.includes('ar')}
            onChange={(event) => toggleLocale('ar', event.target.checked)}
          />
        </div>
        {customers.locales.length === 0 && <p className="hint">Every language.</p>}
      </fieldset>
    </SegmentCard>
  );
}
