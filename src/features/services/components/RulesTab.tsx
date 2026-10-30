// RulesTab: the "Rules and groups" tab: the merchant groups (read-only, managed on the merchants page), the pricing rules, a note on
// where fixed prices are set, and the floor policy. Ports `rulesTab` of 43-p-services.js.
import { useServiceGrants } from '../hooks/useServiceGrants';
import { FixedPricesNote } from './FixedPricesNote';
import { FloorPolicy } from './FloorPolicy';
import { GroupsSection } from './GroupsSection';
import { RulesSection } from './RulesSection';

/** The four blocks of the tab, split by hairlines. */
export function RulesTab() {
  const grants = useServiceGrants();
  return (
    <div className="grid gap-0 divide-y divide-line">
      <GroupsSection grants={grants} />
      <RulesSection grants={grants} />
      <FixedPricesNote />
      <FloorPolicy />
    </div>
  );
}
