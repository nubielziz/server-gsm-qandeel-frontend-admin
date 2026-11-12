// QuickAddReview: step 2 of "Quick add…": says in plain words what the run will do and how many services it adds, before anything
// changes. Above 500 services it asks for a tick box. Built in the demo's dialog style (the demo has no such screen).
import { CheckboxField, TypeTag } from '@/components/ui';
import { CONFIRM_ABOVE, groupKey, groupName, groupsText, servicesText } from '../lib/quickAdd';
import type { QuickAddServiceStatus, ServiceGroup } from '../types';

/** Groups named in the list; the rest is counted ("+3 more"). */
const SHOWN_GROUPS = 10;

export interface QuickAddReviewProps {
  supplierName: string;
  /** `all` when every group with something to add is picked. */
  scope: 'all' | 'groups';
  /** The picked groups that have something to add. */
  groups: readonly ServiceGroup[];
  services: number;
  serviceStatus: QuickAddServiceStatus;
  confirmed: boolean;
  onConfirmed: (confirmed: boolean) => void;
}

/** Step 2: what will happen, the groups with their counts, and the tick box a big run needs. */
export function QuickAddReview({
  supplierName,
  scope,
  groups,
  services,
  serviceStatus,
  confirmed,
  onConfirmed,
}: QuickAddReviewProps) {
  const source =
    scope === 'all' ? `all groups of ${supplierName}` : `${groupsText(groups.length)} of ${supplierName}`;
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium" aria-live="polite">
        This adds {servicesText(services)} from {source}.
      </p>
      <ul className="list-disc space-y-1 ps-5 text-sm text-ink2">
        <li>Each becomes a service in a category named after its group. Missing categories are created.</li>
        <li>
          Price: the supplier&rsquo;s cost plus the default minimum profit. Use Bulk price change on the
          Services page afterwards.
        </li>
        <li>Order fields and quantities are copied from the supplier.</li>
        <li>Services already in the console are not changed.</li>
        <li>{serviceStatus === 'active' ? 'They are added on sale.' : 'They are added switched off.'}</li>
      </ul>
      <ul
        className="max-h-[200px] divide-y divide-line overflow-auto rounded-md border border-line text-sm"
        aria-label="Groups to add"
      >
        {groups.slice(0, SHOWN_GROUPS).map((group) => (
          <li key={groupKey(group)} className="flex items-center gap-2 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate">
              {groupName(group)} <TypeTag>{group.type.toUpperCase()}</TypeTag>
            </span>
            <span className="text-ink2">{servicesText(group.addable)}</span>
          </li>
        ))}
        {groups.length > SHOWN_GROUPS && (
          <li className="px-3 py-1.5 text-ink3">+{groups.length - SHOWN_GROUPS} more</li>
        )}
      </ul>
      {services > CONFIRM_ABOVE && (
        <CheckboxField
          label={`I checked the groups. Add ${servicesText(services)}.`}
          checked={confirmed}
          onChange={(event) => onConfirmed(event.target.checked)}
        />
      )}
    </div>
  );
}
