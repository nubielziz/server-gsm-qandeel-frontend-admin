// TypeTag: the demo's typeTag(text), a small uppercase outlined chip (service type, role, scope…).
import type { ReactNode } from 'react';
import { cx } from './cx';

/** The four service types and their fixed chart series colours (--s1..--s4). */
export type ServiceSeries = 'IMEI' | 'Server' | 'Remote' | 'File';

const SERIES_DOT: Record<ServiceSeries, string> = {
  IMEI: 'bg-s1',
  Server: 'bg-s2',
  Remote: 'bg-s3',
  File: 'bg-s4',
};

export interface TypeTagProps {
  children: ReactNode;
  /** Opt in to a leading dot in the type's series colour. The demo's tag is neutral, so it is off by default. */
  series?: ServiceSeries;
  className?: string;
}

export function TypeTag({ children, series, className }: TypeTagProps) {
  return (
    <span className={cx('tag', className)}>
      {series && (
        <span
          className={cx('me-1 h-1.5 w-1.5 flex-none rounded-sm', SERIES_DOT[series])}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
