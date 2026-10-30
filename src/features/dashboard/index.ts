// Public surface of the dashboard feature: its `/admin/dashboard`, `/admin/reports/top-clients` and `/admin/queues` API
// functions, their types, and the sidebar counts hook (the app wires it through `manifest.ts`). The page itself is not
// re-exported here: it loads lazily from `./pages`.
export * from './api';
export { useDashboardNavCounts } from './hooks/useDashboardNavCounts';
export * from './types';
