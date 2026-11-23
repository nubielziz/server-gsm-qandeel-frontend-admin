// RulesTab: the Merchant price rules view (the old "Rules and groups" tab): the merchant groups (read-only, managed on the merchants page), the
// pricing rules, a note on where fixed prices are set, and the floor policy. The view's one primary button, New rule, sits in the pinned bar.
// Ports `rulesTab` of 43-p-services.js.
import { useState } from 'react';
import { Button, Icon, PinnedBar } from '@/components/ui';
import { useServiceGrants } from '../hooks/useServiceGrants';
import { FixedPricesNote } from './FixedPricesNote';
import { FloorPolicy } from './FloorPolicy';
import { GroupsSection } from './GroupsSection';
import { RulesSection } from './RulesSection';

/** The four blocks of the view, then the pinned bar with New rule (it needs pricing:create and says so when the role lacks it). */
export function RulesTab() {
  const grants = useServiceGrants();
  const [creating, setCreating] = useState(false);
  const createLock = grants.needs('pricing:create');
  return (
    <div className="view-frame">
      <div className="grid gap-8">
        <GroupsSection grants={grants} />
        <RulesSection grants={grants} creating={creating} onCloseCreate={() => setCreating(false)} />
        <FixedPricesNote />
        <FloorPolicy />
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
