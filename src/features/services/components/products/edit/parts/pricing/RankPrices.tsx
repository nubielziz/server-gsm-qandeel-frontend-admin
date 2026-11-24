// RankPrices: the table of the Set Pricing part with one row per merchant rank (a client group, the storefront's retail group left out):
// the rank, a box for its fixed price, and what it pays now. The boxes are the existing group prices form (useGroupPricesForm): saving
// replaces the whole list, sends back the saved prices of the groups with no box (the retail one) and sends `retailPriceSeen`, so the retail
// price, which has its own part, is never touched from here. "Pays now" is the saved price or the words for following the base price.
import { useEffect, type FormEvent, type RefObject } from 'react';
import { DataTable, type DataTableColumn, type FormDialogResult, useReportDirty } from '@/components/ui';
import { money } from '@/lib/format';
import { useGroupPricesForm } from '../../../../../hooks/useGroupPricesForm';
import { groupFieldOf } from '../../../../../lib/priceForms';
import { paysNowOf, type PaysNow } from '../../../../../lib/rankPrices';
import type { ClientGroup, ServiceDetail } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';

/** The save of the rank form, handed to the part so one Save button can run it after the credit. */
export type RankSave = (event: FormEvent<HTMLFormElement>) => Promise<FormDialogResult>;

export interface RankPricesProps {
  service: ServiceDetail;
  /** Every rank, the retail one included: it tells which saved row is the retail price. */
  groups: readonly ClientGroup[];
  /** Off, with the missing permission in its title, for a role that may not change prices. */
  lock: PermissionLock;
  /** The part keeps the form's save here while the table is mounted, and clears it when the table goes. */
  saveRef: RefObject<RankSave | null>;
  /** Says whether the boxes hold unsaved changes. */
  onDirtyChange: (dirty: boolean) => void;
}

// What a rank pays now, in two lines: the figure or the words, and which of the two it is.
function PaysNowCell({ paid }: { paid: PaysNow }) {
  return paid.kind === 'fixed' ? (
    <>
      <span className="tabular-nums">{money(paid.price)}</span>
      <span className="cell-sub">Fixed price</span>
    </>
  ) : (
    <>
      <span>{paid.words}</span>
      <span className="cell-sub">No fixed price</span>
    </>
  );
}

/** The table and its form. It mounts once the groups are loaded: saving replaces the whole list, so it must not start from nothing. */
export function RankPrices({ service, groups, lock, saveRef, onDirtyChange }: RankPricesProps) {
  const { form, submit, listed } = useGroupPricesForm({
    service,
    groups,
    saved: service.groupPrices,
    hideRetail: true,
  });
  const {
    register,
    formState: { errors, isDirty },
  } = form;
  useReportDirty(isDirty, onDirtyChange);
  useEffect(() => {
    saveRef.current = submit;
    return () => {
      saveRef.current = null;
    };
  });

  const columns: DataTableColumn<ClientGroup>[] = [
    { key: 'rank', label: 'Rank', render: (group) => <span className="font-medium">{group.name}</span> },
    {
      key: 'fixed',
      label: 'Fixed price (USD)',
      render: (group) => {
        const message = errors[groupFieldOf(group)]?.message;
        return (
          <>
            <input
              className="input-sm w-36 aria-[invalid=true]:border-crit-dot"
              inputMode="decimal"
              autoComplete="off"
              placeholder="No fixed price"
              aria-label={`Fixed price for ${group.name}`}
              aria-invalid={message ? true : undefined}
              disabled={lock.disabled}
              title={lock.title}
              {...register(groupFieldOf(group))}
            />
            {message && <span className="cell-sub text-crit-fg">{message}</span>}
          </>
        );
      },
    },
    {
      key: 'now',
      label: 'Pays now',
      render: (group) => <PaysNowCell paid={paysNowOf(group, service.groupPrices)} />,
    },
  ];

  return (
    <>
      <p className="mb-3 text-sm text-ink2">
        A fixed price skips the category rules and the rank's discount. Leave a rank blank to use the base
        price less its discount.
      </p>
      <DataTable
        skin="list"
        footer={false}
        caption="Fixed prices per rank"
        columns={columns}
        rows={listed}
        rowKey={(group) => group.id}
        empty={<p className="text-sm text-ink3">There are no merchant ranks to price here.</p>}
      />
    </>
  );
}
