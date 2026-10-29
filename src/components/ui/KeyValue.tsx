// KeyValue: a definition list of label/value rows (the demo's kv(rows) and the .dl classes).
import { Fragment, type ReactNode } from 'react';
import { cx } from './cx';

/** `[label, value]`; a falsy row is skipped so callers can write `cond && [label, value]`. */
export type KeyValueRow = readonly [label: ReactNode, value: ReactNode] | null | false | undefined;

export interface KeyValueProps {
  rows: readonly KeyValueRow[];
  /** `stacked` puts the label above the value, for narrow panels with long hosts and keys (.dl.conn). */
  variant?: 'default' | 'stacked';
  className?: string;
}

export function KeyValue({ rows, variant = 'default', className }: KeyValueProps) {
  return (
    <dl className={cx('dl', variant === 'stacked' && 'conn', className)}>
      {rows.map((row, index) =>
        row ? (
          <Fragment key={index}>
            <dt>{row[0]}</dt>
            <dd>{row[1]}</dd>
          </Fragment>
        ) : null,
      )}
    </dl>
  );
}
