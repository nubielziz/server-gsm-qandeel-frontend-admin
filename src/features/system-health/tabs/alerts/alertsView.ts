// The three views of the Alerts & incidents tab and the address values they read (`?view=`, `?incident=`, `?page=`).
// Pure functions, no demo page (docs/system-health-design.md, "Tabs" and "Permission map").

/** The views in strip order. `permission` is the read permission that shows the view. */
export const ALERT_VIEWS = [
  { id: 'alerts', label: 'Alerts', permission: 'alerts:read' },
  { id: 'rules', label: 'Rules', permission: 'alerts:read' },
  { id: 'incidents', label: 'Incidents', permission: 'incidents:read' },
] as const;

export type AlertsViewId = (typeof ALERT_VIEWS)[number]['id'];

/** One entry of `ALERT_VIEWS`. */
export type AlertsViewDef = (typeof ALERT_VIEWS)[number];

/** Narrows an address value (`?view=`) to a view id. */
export function isAlertsView(value: unknown): value is AlertsViewId {
  return ALERT_VIEWS.some((view) => view.id === value);
}

/** The views the staff member may read, in strip order. A view they cannot read is not in the list at all. */
export function readableViews(can: (permission: string) => boolean): AlertsViewDef[] {
  return ALERT_VIEWS.filter((view) => can(view.permission));
}

/**
 * The view to show. A readable `?view=` wins. Without one, an `?incident=` link means the Incidents view (it is the only
 * view with a drawer). Anything else falls back to the first readable view, so a role with `incidents:read` alone lands on
 * Incidents. Undefined only when nothing is readable.
 */
export function resolveView(
  asked: string | null,
  incident: string | null,
  readable: readonly AlertsViewId[],
): AlertsViewId | undefined {
  if (isAlertsView(asked) && readable.includes(asked)) return asked;
  if (asked === null && incident !== null && readable.includes('incidents')) return 'incidents';
  return readable[0];
}

/** `?incident=<id>` as a number; null for a missing, zero, negative or non-numeric value. */
export function parseIncidentId(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

/** `?page=` as a 1-based page; anything that is not a positive whole number is page 1. */
export function parsePage(raw: string | null): number {
  if (raw === null || !/^\d+$/.test(raw)) return 1;
  return Math.max(1, Number(raw));
}

/** The row range the list hooks take for a 1-based page. */
export function pageRange(page: number, pageSize: number): { start: number; end: number } {
  return { start: (page - 1) * pageSize, end: page * pageSize };
}
