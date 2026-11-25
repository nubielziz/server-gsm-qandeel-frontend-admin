// MoneyNav: the two rows of links under the page title: the strip of tabs (level 1) and the text links of the views of the current tab
// (level 2, none on the Overview). It only draws what `moneyNav` works out; every link is a full view with its own address.
import { StripTabs, ViewLinks } from '@/components/ui';
import type { MoneyViewId, MoneyViewSpec } from '../../lib/moneyViews';
import type { MoneyModules } from '../../lib/modules';
import { currentLink, stripCurrent, stripItems, viewItems } from './moneyNav';

export interface MoneyNavProps {
  /** The views the role may use. */
  usable: readonly MoneyViewSpec[];
  /** The view on screen. */
  view: MoneyViewId;
  /** The loaded views: their two count hooks say what waits (each gates itself on the permission it needs). */
  modules: MoneyModules;
}

/** The strip of tabs, then the row of views of the tab on screen. */
export function MoneyNav({ usable, view, modules }: MoneyNavProps) {
  const { useDepositsWaiting } = modules.finance;
  const { useMoneyBackWaiting } = modules.refunds;
  const deposits = useDepositsWaiting();
  const back = useMoneyBackWaiting();
  const counts = { deposits, refunds: back.refunds, disputes: back.disputes };
  const links = viewItems(usable, view, counts);
  return (
    <>
      <StripTabs items={stripItems(usable, counts)} current={stripCurrent(view)} ariaLabel="Money sections" />
      {links.length > 0 && <ViewLinks items={links} current={currentLink(view)} ariaLabel="Views" />}
    </>
  );
}
