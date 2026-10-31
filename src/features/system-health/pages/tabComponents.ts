// The lazy component of each tab. A tab folder `tabs/<tab>/index.ts` exports one component, `<Name>Tab`, which takes no
// props and reads the range, the permissions and its own address parameters through the feature's hooks. Each tab is
// its own chunk, so the page loads only the tab that is open.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { HealthTabId } from '../lib/healthTabs';

export const TAB_COMPONENTS: Record<HealthTabId, LazyExoticComponent<ComponentType>> = {
  overview: lazy(() => import('../tabs/overview').then((tab) => ({ default: tab.OverviewTab }))),
  api: lazy(() => import('../tabs/api').then((tab) => ({ default: tab.ApiTab }))),
  orders: lazy(() => import('../tabs/orders').then((tab) => ({ default: tab.OrdersTab }))),
  queues: lazy(() => import('../tabs/queues').then((tab) => ({ default: tab.QueuesTab }))),
  alerts: lazy(() => import('../tabs/alerts').then((tab) => ({ default: tab.AlertsTab }))),
  stores: lazy(() => import('../tabs/stores').then((tab) => ({ default: tab.StoresTab }))),
  integrity: lazy(() => import('../tabs/integrity').then((tab) => ({ default: tab.IntegrityTab }))),
};
