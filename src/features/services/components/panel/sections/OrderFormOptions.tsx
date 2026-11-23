// OrderFormOptions: the model, network and MEP lists of a service in the Order form section, each with its number of entries, or a
// note when all three are empty.
import type { ServiceOption } from '../../../types';
import { OrderFormGroup, type PermissionHint } from './OrderFormGroup';
import { listCountText, optionListCounts } from './orderFormSummary';

export interface OrderFormOptionsProps {
  options: readonly ServiceOption[];
  lock: PermissionHint;
  onEdit: () => void;
}

/** One line per option list with its count, and "Edit options…" beside the heading. */
export function OrderFormOptions({ options, lock, onEdit }: OrderFormOptionsProps) {
  const lists = optionListCounts(options);
  const empty = lists.every((list) => list.count === 0);
  return (
    <OrderFormGroup title="Options" editLabel="Edit options…" lock={lock} onEdit={onEdit}>
      {empty ? (
        <p className="rounded-md border border-dashed border-line2 p-3 text-sm text-ink3">
          No option lists yet. The buyer picks no model, network or MEP.
        </p>
      ) : (
        <ul aria-label="Option lists" className="m-0 list-none divide-y divide-line p-0">
          {lists.map((list) => (
            <li key={list.id} className="flex items-center gap-2 py-1.5 text-sm">
              <span className="min-w-0 flex-1 font-medium">{list.label}</span>
              <span className={list.count === 0 ? 'text-xs text-ink3' : 'text-xs text-ink2'}>
                {listCountText(list.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </OrderFormGroup>
  );
}
