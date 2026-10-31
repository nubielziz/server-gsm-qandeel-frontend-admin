// Seed of the incidents of the System health mock: four resolved ones with a full timeline and, in the slow-supplier and
// database-outage scenarios, one that is still open. Times are relative to the seeding. Dev and tests only.
import type { Incident, IncidentSeverity, IncidentStatus, IncidentTimelineEntry, StaffRef } from '../types';
import { DAY, MINUTE, iso } from './clock';
import { SLOW_SUPPLIER_ID, SLOW_SUPPLIER_NAME, type Profile } from './profile';
import { STAFF } from './specs';

type IncidentSeed = {
  title: string;
  severity: IncidentSeverity;
  components: string[];
  summary: string;
  startedAgo: number;
  /** Timeline lines: minutes after the start, status, text. The last status is the incident's. */
  lines: [number, IncidentStatus, string][];
  rootCause?: string;
  by: StaffRef;
};

const HISTORY_INCIDENTS: IncidentSeed[] = [
  {
    title: 'Storefront checkout errors',
    severity: 'major',
    components: ['api', 'gateway:1'],
    summary: 'Card payments failed at the last step for about 25 minutes.',
    startedAgo: 41 * DAY,
    lines: [
      [0, 'investigating', 'Card payments fail at the last step. Looking at the gateway callbacks.'],
      [9, 'identified', 'The gateway changed its callback signature header.'],
      [18, 'monitoring', 'Callback check updated and deployed. Watching new payments.'],
      [26, 'resolved', 'Payments complete again. No money was lost; 14 paid orders were completed by hand.'],
    ],
    rootCause:
      'The gateway renamed the signature header without notice. Our callback check now accepts both names.',
    by: STAFF.rami,
  },
  {
    title: 'Order dispatch queue stalled',
    severity: 'major',
    components: ['workers'],
    summary: 'No orders were sent to suppliers for 1 hour 12 minutes.',
    startedAgo: 26 * DAY,
    lines: [
      [0, 'investigating', 'Orders wait in orders.dispatch and nothing is taken from the queue.'],
      [31, 'identified', 'Workers started with an old Redis key prefix after the last deploy.'],
      [58, 'monitoring', 'Workers restarted with the right prefix; the backlog is draining.'],
      [72, 'resolved', 'Backlog cleared. All delayed orders were sent.'],
    ],
    rootCause:
      'A deploy left the workers on an old Redis key prefix. The prefix now comes from one setting shared with the API.',
    by: STAFF.dana,
  },
  {
    title: 'Gulf Server Hub rate limiting',
    severity: 'minor',
    components: ['supplier:2'],
    summary: 'The supplier answered 429 to about a third of our calls for two hours.',
    startedAgo: 17 * DAY,
    lines: [
      [0, 'investigating', 'Many 429 answers from Gulf Server Hub.'],
      [35, 'identified', 'The supplier lowered its limit to 30 calls a minute without telling us.'],
      [120, 'resolved', 'Our limit for this supplier is now 30 calls a minute.'],
    ],
    rootCause: 'The supplier changed its rate limit. We set our own limit per supplier to match.',
    by: STAFF.dana,
  },
  {
    title: 'Card gateway callbacks delayed',
    severity: 'minor',
    components: ['gateway:1'],
    summary: 'Payment confirmations arrived up to ten minutes late.',
    startedAgo: 9 * DAY,
    lines: [
      [0, 'investigating', 'Payment confirmations are late.'],
      [20, 'identified', 'The gateway retries callbacks in bursts; our webhook worker was too slow.'],
      [47, 'resolved', 'Webhook worker concurrency raised; confirmations are on time.'],
    ],
    rootCause: 'The gateway sent callbacks in bursts and the webhook worker took one at a time.',
    by: STAFF.rami,
  },
];

function openIncidents(profile: Profile): IncidentSeed[] {
  if (profile.slowSupplier) {
    return [
      {
        title: 'Supplier timeouts',
        severity: 'major',
        components: [`supplier:${SLOW_SUPPLIER_ID}`],
        summary: `${SLOW_SUPPLIER_NAME} answers in about 6 seconds and times out. Orders sent to it are late.`,
        startedAgo: 28 * MINUTE,
        lines: [
          [
            0,
            'investigating',
            `Timeouts on ${SLOW_SUPPLIER_NAME}, the first one about ten minutes ago. Checking with the supplier.`,
          ],
          [11, 'identified', 'The supplier confirmed a problem on its side and has no time to fix yet.'],
        ],
        by: STAFF.dana,
      },
    ];
  }
  if (profile.dbDown) {
    return [
      {
        title: 'Database not accepting connections',
        severity: 'critical',
        components: ['postgres', 'api', 'workers'],
        summary: 'Postgres refuses new connections (too many clients). Orders and payments fail.',
        startedAgo: 10 * MINUTE,
        lines: [
          [
            0,
            'investigating',
            'Postgres reports too many clients. Looking for the connections that never close.',
          ],
        ],
        by: STAFF.rami,
      },
    ];
  }
  return [];
}

function toIncident(seed: IncidentSeed, anchor: number): Omit<Incident, 'id'> {
  const startedAt = anchor - seed.startedAgo;
  const timeline: IncidentTimelineEntry[] = seed.lines.map(([minutes, status, text]) => ({
    at: iso(startedAt + minutes * MINUTE),
    status,
    text,
    by: seed.by,
  }));
  const last = seed.lines[seed.lines.length - 1];
  const resolved = last[1] === 'resolved';
  const lastAt = iso(startedAt + last[0] * MINUTE);
  return {
    title: seed.title,
    severity: seed.severity,
    status: last[1],
    components: seed.components,
    summary: seed.summary,
    timeline,
    rootCause: seed.rootCause ?? null,
    startedAt: iso(startedAt),
    resolvedAt: resolved ? lastAt : null,
    alertEventId: null,
    createdBy: seed.by,
    resolvedBy: resolved ? seed.by : null,
    createdAt: iso(startedAt),
    updatedAt: lastAt,
  };
}

/** Resolved incidents first (oldest first), then the one open in this scenario. */
export function seedIncidents(profile: Profile, anchor: number): Omit<Incident, 'id'>[] {
  return [...HISTORY_INCIDENTS, ...openIncidents(profile)].map((seed) => toIncident(seed, anchor));
}
