// PermissionGroupBox: one group of permissions in the role dialog (all the `staff:*` ones, say) with a "select all" box.
// A permission already granted by a wildcard on the role (`orders:*`) shows ticked and cannot be unticked on its own.
import { useId } from 'react';
import { CheckboxField, IndeterminateCheckbox } from '@/components/ui';
import { hasPermission } from '@/lib/auth/permissions';
import { OTHER_GROUP, type PermissionGroup } from '../lib/permissions';

export interface PermissionGroupBoxProps {
  group: PermissionGroup;
  value: readonly string[];
  onChange: (next: string[]) => void;
}

/**
 * One group of the picker. Permissions that a wildcard on the role already grants show as ticked and
 * cannot be unticked one by one.
 */
export function PermissionGroupBox({ group, value, onChange }: PermissionGroupBoxProps) {
  const headingId = useId();
  const direct = new Set(value);
  // Granted by something else on the role (a wildcard), so there is no box of its own to untick.
  const covered = (key: string) => !direct.has(key) && hasPermission(value, key);
  const ticked = (key: string) => direct.has(key) || covered(key);

  const tickedCount = group.items.filter((item) => ticked(item.key)).length;
  const all = tickedCount === group.items.length;

  function toggle(key: string, on: boolean) {
    onChange(on ? [...value, key] : value.filter((existing) => existing !== key));
  }

  function toggleAll(on: boolean) {
    const keys = new Set(group.items.map((item) => item.key));
    const rest = value.filter((existing) => !keys.has(existing));
    // Covered permissions need no entry of their own; the others in the group are added or removed together.
    const added = on ? group.items.filter((item) => !covered(item.key)).map((item) => item.key) : [];
    onChange([...rest, ...added]);
  }

  return (
    <fieldset className="rounded-md border border-line" aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-3 rounded-t-md bg-sunken px-3 py-2">
        <span id={headingId} className="text-sm font-medium">
          {group.title}
        </span>
        <span className="flex items-center gap-2 text-xs text-ink3">
          {tickedCount} of {group.items.length}
          {group.id !== OTHER_GROUP && (
            <IndeterminateCheckbox
              aria-label={`Select all ${group.title}`}
              checked={all}
              indeterminate={tickedCount > 0 && !all}
              onChange={(event) => toggleAll(event.target.checked)}
            />
          )}
        </span>
      </div>
      <div className="grid gap-x-4 gap-y-1.5 p-3 sm:grid-cols-2">
        {group.items.map((item) => (
          <CheckboxField
            key={item.key}
            label={item.label}
            title={covered(item.key) ? 'Granted by a wildcard on this role' : item.key}
            checked={ticked(item.key)}
            disabled={covered(item.key)}
            onChange={(event) => toggle(item.key, event.target.checked)}
          />
        ))}
      </div>
    </fieldset>
  );
}
