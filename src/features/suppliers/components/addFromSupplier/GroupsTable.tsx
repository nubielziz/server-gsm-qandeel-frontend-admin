// GroupsTable: the groups of a supplier that have the page's kind, with what each can add: a tick box per row (off for a group with nothing to
// add) and a header box for the rows shown. The list skin of Product / Services; the data is the quick add's service-groups answer.
import { IndeterminateCheckbox, type RowSelection } from '@/components/ui';
import { num } from '@/lib/format';
import { groupKey, groupName, pickable } from '../../lib/quickAdd';
import type { ServiceGroup } from '../../types';

export interface GroupsTableProps {
  /** The groups shown (the search may have left some out). */
  rows: readonly ServiceGroup[];
  /** The picks, by `groupKey`. They belong to the form, so they stay while the search changes. */
  selection: RowSelection<string>;
}

/** The "Cannot add" cell: services the supplier no longer lists plus those of a type the console cannot sell, with the split as its title. */
function CannotAdd({ group }: { group: ServiceGroup }) {
  const count = group.unavailable + group.unsupported;
  if (count === 0) return <span className="text-ink3">–</span>;
  return (
    <span
      title={`${num(group.unavailable)} no longer listed by the supplier, ${num(group.unsupported)} of a type the console cannot sell`}
    >
      {num(count)}
    </span>
  );
}

/** The table. The header box ticks every shown row that has something to add, and shows a dash when only some are ticked. */
export function GroupsTable({ rows, selection }: GroupsTableProps) {
  const shownKeys = pickable(rows).map(groupKey);
  const pickedShown = shownKeys.filter((key) => selection.has(key)).length;
  const allShownPicked = shownKeys.length > 0 && pickedShown === shownKeys.length;

  return (
    <div className="tbl-wrap max-h-[420px]">
      <table className="tbl tbl-list" aria-label="Supplier groups">
        <thead>
          <tr>
            <th className="w-9 !ps-3.5 !pe-0" scope="col">
              <IndeterminateCheckbox
                aria-label="Check the groups shown"
                checked={allShownPicked}
                indeterminate={pickedShown > 0 && !allShownPicked}
                disabled={shownKeys.length === 0}
                onChange={(event) => selection.setMany(shownKeys, event.target.checked)}
              />
            </th>
            <th scope="col">Group</th>
            <th scope="col" className="num">
              To add
            </th>
            <th scope="col" className="num">
              In console
            </th>
            <th scope="col" className="num">
              Cannot add
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((group) => {
            const key = groupKey(group);
            return (
              <tr key={key}>
                <td className="!pe-0">
                  <input
                    type="checkbox"
                    className="check"
                    aria-label={`Select ${groupName(group)}`}
                    checked={group.addable > 0 && selection.has(key)}
                    disabled={group.addable === 0}
                    onChange={(event) => selection.toggle(key, event.target.checked)}
                  />
                </td>
                <td className={group.remoteGroup === '' ? 'text-ink3' : undefined}>{groupName(group)}</td>
                <td className="num">{num(group.addable)}</td>
                <td className="num">{num(group.imported)}</td>
                <td className="num">
                  <CannotAdd group={group} />
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center text-ink3">
                No group matches the search.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
