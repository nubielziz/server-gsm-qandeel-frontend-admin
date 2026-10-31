// UptimeTable: the buckets behind the uptime bars as a table, the accessible fallback of UptimeBars' "Table view".
import { bucketTime, formatValue } from '../lib';
import type { CheckBucket } from '../types';
import { HealthBadge } from './HealthBadge';

export interface UptimeTableProps {
  buckets: readonly CheckBucket[];
  /** Bucket length in seconds, for the "14:00 to 14:15" time. */
  bucketSeconds?: number;
  /** Screen-reader caption: the bars' name. */
  caption: string;
}

/** Newest first. A bucket where no check ran says "No data", and its failure count is a dash, not a reassuring 0. */
export function UptimeTable({ buckets, bucketSeconds, caption }: UptimeTableProps) {
  return (
    <div className="tbl-wrap max-h-[264px]">
      <table className="tbl">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Status</th>
            <th scope="col" className="num">
              Checks
            </th>
            <th scope="col" className="num">
              Failed
            </th>
            <th scope="col" className="num">
              p95 time
            </th>
          </tr>
        </thead>
        <tbody>
          {buckets
            .slice()
            .reverse()
            .map((bucket) => {
              const ran = bucket.status !== 'unknown' && bucket.checks > 0;
              return (
                <tr key={bucket.start}>
                  <td>{bucketTime(bucket, bucketSeconds)}</td>
                  <td>
                    <HealthBadge status={bucket.status} label={ran ? undefined : 'No data'} />
                  </td>
                  <td className="num">{bucket.checks}</td>
                  <td className="num">{ran ? bucket.failures : '–'}</td>
                  <td className="num">{formatValue(bucket.latencyMs, 'ms')}</td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
