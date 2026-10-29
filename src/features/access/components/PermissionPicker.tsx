// PermissionPicker: the list of permissions in the role dialog, grouped by their prefix (`staff`, `orders`…), with a
// switch for the wildcard `*`. It holds no state: the dialog owns the list of permission strings.
import { useMemo } from 'react';
import { CheckboxField } from '@/components/ui';
import { groupPermissions } from '../lib/permissions';
import type { Permission } from '../types';
import { PermissionGroupBox } from './PermissionGroupBox';

export interface PermissionPickerProps {
  /** Every permission that exists (`GET /admin/permissions`, normalised). */
  catalog: readonly Permission[];
  /** The permission strings of the role: catalog keys, and anything else already on it (kept, not dropped). */
  value: readonly string[];
  onChange: (next: string[]) => void;
}

/**
 * Lets the role dialog choose permissions group by group. It holds no state of its own.
 */
export function PermissionPicker({ catalog, value, onChange }: PermissionPickerProps) {
  const groups = useMemo(() => groupPermissions(catalog, value), [catalog, value]);
  const everything = value.includes('*');
  return (
    <div className="space-y-3">
      <CheckboxField
        label="Everything (*)"
        hint="Grants every permission, including ones added later. Use it for owners only."
        align="start"
        checked={everything}
        onChange={(event) =>
          onChange(event.target.checked ? [...value, '*'] : value.filter((existing) => existing !== '*'))
        }
      />
      {groups.map((group) => (
        <PermissionGroupBox key={group.id} group={group} value={value} onChange={onChange} />
      ))}
    </div>
  );
}
