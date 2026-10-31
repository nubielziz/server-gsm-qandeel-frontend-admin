// Text and colours for the check buckets behind the uptime bars (`CheckBucket` of GET /admin/system/checks).
// No demo screen (docs/system-health-design.md, "Charts"). Colour is backed by words: tooltip, live readout, summary.
import { fmtTime } from '@/lib/format';
import type { CheckBucket, CheckStatus } from '../types';
import { formatValue } from './measure';
import { chartDetail } from './range';
import { statusMeta } from './status';

// Status dots are the bar colours; a bucket with no check is a hairline outline, so "no data" is never green. The outline
// is an inset ring, not a border: a border would give every cell a 2px minimum width and make a long strip overflow.
const BUCKET_CLASS: Record<CheckStatus, string> = {
  ok: 'bg-good-dot',
  degraded: 'bg-warn-dot',
  down: 'bg-crit-dot',
  unknown: 'bg-transparent ring-1 ring-inset ring-line2',
};

/** Tailwind classes that colour one bar cell. A status we do not know draws as no data. */
export function bucketClass(status: CheckStatus): string {
  return Object.hasOwn(BUCKET_CLASS, status) ? BUCKET_CLASS[status] : BUCKET_CLASS.unknown;
}

/** The status word of a bucket. A bucket where no check ran says "No data" instead of "Unknown". */
export function bucketWord(bucket: Pick<CheckBucket, 'status'>): string {
  return bucket.status === 'unknown' ? 'No data' : statusMeta(bucket.status).word;
}

/** How many buckets had each status. */
export type BucketCounts = Record<CheckStatus, number>;

export function countBuckets(buckets: readonly Pick<CheckBucket, 'status'>[]): BucketCounts {
  const counts: BucketCounts = { ok: 0, degraded: 0, down: 0, unknown: 0 };
  for (const bucket of buckets) counts[Object.hasOwn(counts, bucket.status) ? bucket.status : 'unknown'] += 1;
  return counts;
}

/** The counts in one sentence for screen readers: "22 ok, 1 degraded, 1 down, 2 with no data". Empty without buckets. */
export function bucketSummary(buckets: readonly Pick<CheckBucket, 'status'>[]): string {
  const counts = countBuckets(buckets);
  return [
    counts.ok && `${counts.ok} ok`,
    counts.degraded && `${counts.degraded} degraded`,
    counts.down && `${counts.down} down`,
    counts.unknown && `${counts.unknown} with no data`,
  ]
    .filter(Boolean)
    .join(', ');
}

/** When a bucket was: "Thu, 05 Mar, 14:00", and "Thu, 05 Mar, 14:00 to 14:15" when the bucket length is known. */
export function bucketTime(bucket: Pick<CheckBucket, 'start'>, bucketSeconds?: number): string {
  const start = chartDetail(bucket.start);
  const end = bucketSeconds ? fmtTime(Date.parse(bucket.start) + bucketSeconds * 1000) : '';
  return end ? `${start} to ${end}` : start;
}

/** What a bucket says besides its status word: how many checks failed and the p95 response time. */
export function bucketFacts(bucket: CheckBucket): string[] {
  if (bucket.status === 'unknown' || bucket.checks === 0) return ['No check ran'];
  const facts = [`${bucket.failures} of ${bucket.checks} checks failed`];
  if (bucket.latencyMs !== null) facts.push(`p95 ${formatValue(bucket.latencyMs, 'ms')}`);
  return facts;
}

/** The whole readout of one bucket in a single line: "Thu, 05 Mar, 14:00: Down, 3 of 15 checks failed, p95 6.2 s". */
export function bucketReadout(bucket: CheckBucket, bucketSeconds?: number): string {
  return `${bucketTime(bucket, bucketSeconds)}: ${[bucketWord(bucket), ...bucketFacts(bucket)].join(', ')}`;
}
