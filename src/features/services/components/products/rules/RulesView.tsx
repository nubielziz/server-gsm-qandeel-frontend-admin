// RulesView: the Price Rules view of the Product / Services page: the merchant price rules (with the ranks), the shop price rules
// (the storefront feature's retail pricing, with the proposals that wait counted on its link) and the price check. The three sub-views are
// plain text links under the page's own (the kit's ViewLinks, the way the reference draws "By Admin | By User"), each a full view with an
// address of its own; there is no card, no tab strip and no count chip. A sub-view the role may not open has no link.
// Their editors (the rule forms, the previews) stay dialogs in this version.
import { ViewLinks, type ViewLinkItem } from '@/components/ui';
import { RetailPricingTab, useStorefrontGrants, useWaitingCount } from '@/features/storefront';
import { useTabEnter } from '@/lib/motion';
import { useRulesTab } from '../../../hooks/useRulesTab';
import { productsPath } from '../../../lib/productsPath';
import { ResolverTab } from '../../ResolverTab';
import { RulesTab } from '../../RulesTab';
import type { ProductsViewProps } from '../types';
import { RULES_TAB_SPECS } from './rulesTabs';

/** The row of sub-view links and the open sub-view. Needs pricing:read (the view's registry row). */
export function RulesView({ type, grants }: ProductsViewProps) {
  const shop = useStorefrontGrants();
  const tabs = RULES_TAB_SPECS.filter((spec) => grants.canAll(spec.permissions));
  const { current } = useRulesTab(tabs, type);
  // The sub-view fades in from the side of the link that was clicked. A hook, so it comes before the early return below.
  const section = useTabEnter(
    current?.id ?? '',
    tabs.map((spec) => spec.id),
  );
  // The proposals that wait for a person are told on the Shop price rules link as plain words (none waiting: no words).
  const waiting = useWaitingCount(shop.ready && shop.can('pricing:read'));
  const items: ViewLinkItem[] = tabs.map((spec) => ({
    id: spec.id,
    label: spec.id === 'shop' && waiting ? `${spec.label} (${waiting} waiting)` : spec.label,
    to: productsPath({ view: 'rules', type, tab: spec.id }),
  }));

  if (!current) return null;
  return (
    <>
      <div className="mt-3">
        <ViewLinks items={items} current={current.id} ariaLabel="Price rules sections" />
      </div>
      {/* A flex column that takes what the page leaves, so the sub-view's own frame ends with its pinned bar at the foot of the window. */}
      <section ref={section} aria-label={current.label} className="mt-4 flex flex-1 flex-col">
        {current.id === 'merchant' && <RulesTab />}
        {current.id === 'shop' && <RetailPricingTab grants={shop} />}
        {current.id === 'check' && <ResolverTab type={type} />}
      </section>
    </>
  );
}
