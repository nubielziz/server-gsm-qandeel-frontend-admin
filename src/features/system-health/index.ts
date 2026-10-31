// Public surface of the system-health feature: its DTOs, the `/admin/system/*`, `/admin/alerts`, `/admin/alert-rules` and
// `/admin/incidents` API functions with the data-provider registry, and the address helper for links to the page and its tabs.
// The page itself loads lazily from `./pages`.
export * from './api';
export * from './types';
export { HEALTH_PATH, healthPath, type HealthTabId } from './lib/healthTabs';
