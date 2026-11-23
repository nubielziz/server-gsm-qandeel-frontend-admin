// RetailPricingTab: the Shop price rules view (new, backend feature 31): the rules that price the shop from each service's cost, and the list of
// what the server did when a cost moved, with the proposals that wait for a person. Two sections of one view, no card. The view's one primary
// button, New rule, sits in the pinned bar. Needs pricing:read; each button says which write permission it needs.
import { useState } from 'react';
import { Button, Icon, PinnedBar } from '@/components/ui';
import type { StorefrontGrants } from '../../hooks/useStorefrontGrants';
import { RetailChangesSection } from './RetailChangesSection';
import { RetailRulesSection } from './RetailRulesSection';

/** The rules section, then the price changes section, then the pinned bar. */
export function RetailPricingTab({ grants }: { grants: StorefrontGrants }) {
  const [creating, setCreating] = useState(false);
  const createLock = grants.needs('pricing:create');
  return (
    <div className="view-frame">
      <div className="grid gap-8">
        <RetailRulesSection grants={grants} creating={creating} onCloseCreate={() => setCreating(false)} />
        <RetailChangesSection grants={grants} />
      </div>
      <PinnedBar>
        <Button
          variant="primary"
          disabled={createLock.disabled}
          title={createLock.title}
          onClick={() => setCreating(true)}
        >
          <Icon name="plus" className="ic-sm" />
          New rule
        </Button>
      </PinnedBar>
    </div>
  );
}
