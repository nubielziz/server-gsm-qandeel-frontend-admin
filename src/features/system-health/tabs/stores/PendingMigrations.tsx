// PendingMigrations: the database migrations that are written but not applied yet, names in mono. Part of the Postgres card.
import type { ReactNode } from 'react';
import type { CheckStatus } from '../../types';
import { isUnreadable } from './storeFigures';

export interface PendingMigrationsProps {
  names: readonly string[];
  /** The store's status: an empty list from a database that is down or unknown is no answer, so it prints "No data". */
  status: CheckStatus;
}

/** One name per line, wrapped anywhere so a long name never widens the card. A neutral line when nothing is pending. */
export function PendingMigrations({ names, status }: PendingMigrationsProps) {
  let body: ReactNode;
  if (names.length > 0) {
    body = (
      <ul className="m-0 list-none space-y-0.5 p-0">
        {names.map((name) => (
          <li key={name} className="mono break-all">
            {name}
          </li>
        ))}
      </ul>
    );
  } else if (isUnreadable(status)) {
    body = <span className="text-ink3">No data</span>;
  } else {
    body = <span className="text-ink2">None pending</span>;
  }
  return (
    <div>
      <p className="m-0 text-xs text-ink3">Pending migrations</p>
      <div className="mt-0.5 text-sm">{body}</div>
    </div>
  );
}
