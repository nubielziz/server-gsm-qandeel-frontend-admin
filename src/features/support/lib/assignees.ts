// The options of the Assignee select. Ports `['Lina S.', 'Rami K.', 'Omar T.']` of threadView (49-p-support.js), which the demo
// hard-coded; the console uses the real staff list. A staff member who cannot read the staff list still gets themselves and the
// current assignee, so the select never shows a name it has no option for.
import type { SelectOption } from '@/components/ui';
import type { StaffRef } from '../types';

/** A staff member as the select needs them. `suspended` accounts are left out unless they are the current assignee. */
export type AssigneeCandidate = { id: number; name: string; status?: string };

export function assigneeOptions(
  staff: readonly AssigneeCandidate[],
  me: StaffRef | undefined,
  current: StaffRef | null,
): SelectOption[] {
  const people = new Map<number, string>();
  for (const person of staff) if (person.status !== 'suspended') people.set(person.id, person.name);
  if (me && !people.has(me.id)) people.set(me.id, me.name);
  if (current && !people.has(current.id)) people.set(current.id, current.name);
  return [
    { value: '', label: 'Unassigned' },
    ...[...people].map(([id, name]) => ({
      value: String(id),
      label: id === me?.id ? `${name} (you)` : name,
    })),
  ];
}
