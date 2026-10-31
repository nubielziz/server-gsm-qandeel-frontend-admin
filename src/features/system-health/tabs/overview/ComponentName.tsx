// ComponentName: the name cell of a row in the Overview tab's components list: a button that picks the component for the
// chart, its kind (a link to the Suppliers page for a supplier) and the last failure text.
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Icon, cx } from '@/components/ui';
import { supplierPath } from '@/features/suppliers';
import type { HealthComponent } from '../../types';
import { kindWord } from './componentRows';

export interface ComponentNameProps {
  component: HealthComponent;
  /** This component is the one the chart shows. */
  picked: boolean;
  onPick: (key: string) => void;
  /** The staff member may open the Suppliers page (`suppliers:read`): a hint, the page checks it too. */
  canOpenSupplier: boolean;
  /** The status badge, for the phone card, where the name leads and the status has no column of its own. */
  badge?: ReactNode;
}

/**
 * The button is the keyboard path to the chart (a click on the empty part of the row does the same for the mouse). The
 * picked one is marked with an icon and the accent ink, and says so with `aria-current`. The failure text is the server's
 * own words, muted under the name; a screen reader hears what it is.
 */
export function ComponentName({ component, picked, onPick, canOpenSupplier, badge }: ComponentNameProps) {
  const { key, name, kind, detail, supplierId } = component;
  const kindText = kindWord(kind);
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          className={cx(
            'inline-flex items-center gap-1 rounded-sm text-start font-medium underline-offset-2 hover:underline',
            picked && 'text-accent-ink',
          )}
          aria-current={picked ? 'true' : undefined}
          title={picked ? 'Shown in the response time chart' : `Show the response time of ${name}`}
          onClick={() => onPick(key)}
        >
          {picked && <Icon name="pulse" className="ic-sm flex-none" />}
          {name}
        </button>
        {kind === 'supplier' && supplierId !== null && canOpenSupplier ? (
          <Link
            className="link inline-flex items-center gap-0.5 text-xs"
            to={supplierPath(supplierId)}
            aria-label={`Open ${name} on the Suppliers page`}
          >
            {kindText}
            <Icon name="arrowR" className="ic-xs" />
          </Link>
        ) : (
          <span className="text-xs font-normal text-ink3">{kindText}</span>
        )}
        {badge && <span className="ms-auto font-normal">{badge}</span>}
      </div>
      {detail && (
        <p className="mt-0.5 break-words text-xs font-normal text-ink3">
          <span className="sr-only">Last failure: </span>
          {detail}
        </p>
      )}
    </div>
  );
}
