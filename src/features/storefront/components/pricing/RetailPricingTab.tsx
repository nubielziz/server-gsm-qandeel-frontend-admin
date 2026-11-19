// RetailPricingTab: the "Retail pricing" tab (new, backend feature 31): the rules that price the shop from each service's cost,
// and the list of what the server did when a cost moved, with the proposals that wait for a person. Two blocks in one panel,
// split by a hairline. Needs pricing:read; each button says which write permission it needs.
import { Panel } from '@/components/ui';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { RetailChangesSection } from './RetailChangesSection';
import { RetailRulesSection } from './RetailRulesSection';

/** The rules block, then the price changes block. */
export function RetailPricingTab({ grants }: { grants: StorefrontGrants }) {
  return (
    <Panel flush>
      <div className="grid gap-0 divide-y divide-line">
        <RetailRulesSection grants={grants} />
        <RetailChangesSection grants={grants} />
      </div>
    </Panel>
  );
}
