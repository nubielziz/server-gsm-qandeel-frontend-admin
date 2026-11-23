// The open sub-view of the Price Rules view, kept in the address (`?view=rules&tab=shop`). A tab change starts the new tab clean: the keys of
// one tab mean nothing to another (the price check's `service` is not the code stock's), so they are dropped. An unknown or forbidden tab
// falls back to the first tab the role may open, as the address without a tab does.
import { useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { ServiceType } from '@/lib/serviceTypes';
import type { RulesTabSpec } from '../components/products/rules/rulesTabs';
import { productsPath, type RulesTabId } from '../lib/productsPath';

/** `visible` are the tabs the role may open, in order. `current` is undefined only when there are none. */
export function useRulesTab(visible: readonly RulesTabSpec[], type: ServiceType) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const raw = params.get('tab');
  const current = visible.find((spec) => spec.id === raw) ?? visible[0];

  /** Opens a tab. A new history entry is added, so Back returns to the tab the staff member came from. */
  const setTab = useCallback(
    (tab: RulesTabId) => void navigate(productsPath({ view: 'rules', type, tab })),
    [navigate, type],
  );

  return { current, setTab };
}
