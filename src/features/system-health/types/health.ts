// The overall status, components, build, maintenance and check history: `GET /admin/system/health`,
// `GET /admin/system/checks` and `PUT /admin/system/maintenance`. Assumed contract (docs/ASSUMED_CONTRACTS.md).
import type { Id, IsoDateTime } from '@/lib/api';
import type { AlertSeverity, AlertStatus, IncidentSeverity, IncidentStatus } from './alerts';
import type { CheckStatus, Measure, OverallStatus, SeriesPoint, StaffRef, TimeRange } from './common';

/** What a component is: a core service (database, cache, storage, workers), one supplier or one payment gateway. */
export type ComponentKind = 'core' | 'supplier' | 'gateway';

/** Uptime of one component, or of the whole platform, over the three fixed windows. */
export interface UptimeWindows {
  h24: Measure;
  d7: Measure;
  d30: Measure;
}

/** One checked component, from the worker's checks every minute (`service_checks`). */
export interface HealthComponent {
  /** Stable key, also accepted by `GET /admin/system/checks?component=` ("postgres", "redis", "supplier:3"). */
  key: string;
  name: string;
  kind: ComponentKind;
  status: CheckStatus;
  /** When the current status began. */
  since: IsoDateTime | null;
  /** Response time of the last check, with the server's thresholds. */
  latency: Measure;
  uptime: UptimeWindows;
  lastCheckedAt: IsoDateTime | null;
  /** The last failure text of a failing check ("timeout after 6000 ms"). */
  detail: string | null;
  supplierId: Id | null;
  gatewayId: Id | null;
}

/** The running build. */
export interface BuildInfo {
  version: string;
  commit: string;
  environment: string;
  deployedAt: IsoDateTime | null;
}

/** Whether the monitoring backend (Prometheus) answered. When it did not, nothing that depends on it shows green. */
export interface MonitoringState {
  status: 'available' | 'unavailable';
  detail: string | null;
  lastScrapeAt: IsoDateTime | null;
}

/** What maintenance closes: the storefront, checkout only, merchant API orders, or all three. Never the admin console. */
export type MaintenanceScope = 'store' | 'checkout' | 'api_orders' | 'all';

/** Maintenance mode as stored in settings. */
export interface MaintenanceState {
  enabled: boolean;
  scope: MaintenanceScope | null;
  /** Shown to customers with the 503 MAINTENANCE answer. */
  message: string | null;
  expectedEndAt: IsoDateTime | null;
  startedAt: IsoDateTime | null;
  startedBy: StaffRef | null;
}

/** Body of `PUT /admin/system/maintenance`: switch it on (or change it) with a scope and a message, or switch it off. */
export type SetMaintenanceBody =
  | { enabled: true; scope: MaintenanceScope; message: string; expectedEndAt: IsoDateTime | null }
  | { enabled: false };

/** An open alert as the health summary lists it (the full record is an `AlertEvent`). */
export interface AlertSummary {
  id: Id;
  ruleName: string;
  severity: AlertSeverity;
  status: Extract<AlertStatus, 'firing' | 'acknowledged'>;
  subjectLabel: string | null;
  startedAt: IsoDateTime | null;
}

/** An ongoing incident as the health summary lists it (the full record is an `Incident`). */
export interface IncidentSummary {
  id: Id;
  title: string;
  severity: IncidentSeverity;
  status: Exclude<IncidentStatus, 'resolved'>;
  components: string[];
  startedAt: IsoDateTime | null;
}

/** Answer of `GET /admin/system/health`: everything the verdict, the Overview and the shell banner need. */
export interface SystemHealth {
  status: OverallStatus;
  /** When the current overall status began. */
  since: IsoDateTime | null;
  /** When the server put this answer together. */
  checkedAt: IsoDateTime;
  monitoring: MonitoringState;
  build: BuildInfo;
  components: HealthComponent[];
  /** Platform uptime; `daily` holds the last 30 days, one point per day. */
  uptime: UptimeWindows & { daily: SeriesPoint[] };
  /** Open alerts (firing or acknowledged); `open` is a count with its state, `trend` the last 24 hours. */
  alerts: { open: Measure; critical: number; items: AlertSummary[]; trend: SeriesPoint[] };
  /** Incidents that are not resolved. */
  incidents: IncidentSummary[];
  maintenance: MaintenanceState;
}

/** Query of `GET /admin/system/checks`. Without `component`, every component comes back. */
export interface ChecksQuery {
  range: TimeRange;
  component?: string;
}

/** One time bucket of a component's checks; `status` is the worst one seen, `unknown` when no check ran. */
export interface CheckBucket {
  start: IsoDateTime;
  status: CheckStatus;
  checks: number;
  failures: number;
  /** p95 response time of the bucket; null without checks. */
  latencyMs: number | null;
}

/** Check history of one component over the range: the uptime bars and the response time line. */
export interface ComponentChecks {
  key: string;
  name: string;
  /** Uptime over the range. */
  uptime: Measure;
  /** Current response time with the thresholds drawn on the chart. */
  latency: Measure;
  buckets: CheckBucket[];
}

/** Answer of `GET /admin/system/checks`. */
export interface ChecksResponse {
  range: TimeRange;
  bucketSeconds: number;
  components: ComponentChecks[];
}
