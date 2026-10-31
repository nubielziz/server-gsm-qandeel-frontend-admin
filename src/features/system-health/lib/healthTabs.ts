// The tabs of the System health page: their names in the address, labels and the permissions that show them, and the
// address helper that other pages and tabs use to link here. Pure data and functions. No demo page
// (docs/system-health-design.md, "Tabs" and "Permission map").

/**
 * The seven tabs in the order of the tab strip. `id` is the value of `?tab=`. A tab shows when the staff member holds
 * any one of its `permissions`; the Alerts tab opens for alerts or incidents readers, the others need `system:read`.
 */
export const HEALTH_TABS = [
  { id: 'overview', label: 'Overview', permissions: ['system:read'] },
  { id: 'api', label: 'API', permissions: ['system:read'] },
  { id: 'orders', label: 'Orders & suppliers', permissions: ['system:read'] },
  { id: 'queues', label: 'Queues & jobs', permissions: ['system:read'] },
  { id: 'alerts', label: 'Alerts & incidents', permissions: ['alerts:read', 'incidents:read'] },
  { id: 'stores', label: 'Data stores', permissions: ['system:read'] },
  { id: 'integrity', label: 'Integrity', permissions: ['system:read'] },
] as const;

export type HealthTabId = (typeof HEALTH_TABS)[number]['id'];

/** One entry of `HEALTH_TABS`, widened so the permissions read as a plain list. */
export interface HealthTabDef {
  id: HealthTabId;
  label: string;
  permissions: readonly string[];
}

/** The tab shown when the address names none. A role that cannot read it starts on its first visible tab instead. */
export const DEFAULT_HEALTH_TAB: HealthTabId = 'overview';

/** The path of the page. */
export const HEALTH_PATH = '/system-health';

/** Narrows an address value (`?tab=`) to a tab id. */
export function isHealthTab(value: unknown): value is HealthTabId {
  return HEALTH_TABS.some((tab) => tab.id === value);
}

/** A value of a link parameter. Empty text, `false`, `null` and `undefined` leave the parameter out. */
export type HealthParam = string | number | boolean | null | undefined;

/**
 * The address of the System health page, a tab and the parameters that tab reads: `healthPath('alerts', { view:
 * 'incidents', incident: 5 })` is `/system-health?tab=alerts&view=incidents&incident=5`. The default tab leaves no
 * `tab` parameter, like the other pages leave out their defaults.
 */
export function healthPath(tab?: HealthTabId, params: Readonly<Record<string, HealthParam>> = {}): string {
  const query = new URLSearchParams();
  if (tab && tab !== DEFAULT_HEALTH_TAB) query.set('tab', tab);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '' || value === false) continue;
    query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${HEALTH_PATH}?${text}` : HEALTH_PATH;
}
