// AuthStatusLine and AuthStatusList: the real facts of this console (environment, API, build, time) as one mono line
// for phones and as a `<dl>` on the ruled sheet of wide screens. Both belong to AuthLayout.
import { Fragment } from 'react';
import { cx } from '@/components/ui';
import type { AuthEnvironment } from '../hooks/useAuthEnvironment';

/** One mono line under the form column: environment, API and build. The time stays on the sheet to keep this short. */
export function AuthStatusLine({ facts, className }: { facts: AuthEnvironment; className?: string }) {
  return (
    <p className={cx('break-words font-mono text-2xs text-ink3', className)}>
      {[facts.env, facts.api, facts.build].join(' · ')}
    </p>
  );
}

const ROWS = [
  ['env', 'env'],
  ['api', 'api'],
  ['build', 'build'],
  ['time', 'time'],
] as const;

/** The same facts with their names, for the foot of the ruled sheet. Names `text-ink3`, values `text-ink2`. */
export function AuthStatusList({ facts, className }: { facts: AuthEnvironment; className?: string }) {
  return (
    <dl className={cx('grid grid-cols-[3rem_minmax(0,1fr)] gap-x-4 gap-y-2 font-mono text-2xs', className)}>
      {ROWS.map(([key, name]) => (
        <Fragment key={key}>
          <dt className="text-ink3">{name}</dt>
          <dd className="break-words text-ink2">{facts[key]}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
