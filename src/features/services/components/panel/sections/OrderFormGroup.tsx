// OrderFormGroup: one block of the Order form section (the fields, or the options): a small heading, its edit button and the summary.
// The button keeps the permission hint the row menu uses for the same dialogs.
import type { ReactNode } from 'react';
import { Button, Icon } from '@/components/ui';

/** What `grants.needs(...)` returns: whether a control is off and, when it is, the permission it needs, as its title. */
export type PermissionHint = { disabled: boolean; title?: string };

export interface OrderFormGroupProps {
  title: string;
  /** The words of the button, such as "Edit fields…". */
  editLabel: string;
  /** Off, with the missing permission in its title, when the staff member may not change the service. */
  lock: PermissionHint;
  onEdit: () => void;
  children: ReactNode;
}

/** A heading row (title, edit button) above the summary of one part of the order form. */
export function OrderFormGroup({ title, editLabel, lock, onEdit, children }: OrderFormGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="min-w-0 flex-1 text-xs font-medium text-ink2">{title}</h4>
        <Button size="sm" disabled={lock.disabled} title={lock.title} onClick={onEdit}>
          <Icon name="edit" className="ic-sm" />
          {editLabel}
        </Button>
      </div>
      {children}
    </div>
  );
}
