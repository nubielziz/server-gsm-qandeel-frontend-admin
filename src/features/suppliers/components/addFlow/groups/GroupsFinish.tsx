// GroupsFinish: the last step of the Add services flow before the run starts: how the services are added (on sale or switched off) and
// the shop switch. Above 500 services it also asks for a tick box. The Start button is in the dialog's footer.
import { CheckboxField } from '@/components/ui';
import { servicesText, sourceText } from '../../../lib/quickAdd';
import type { ShopRule } from '../../../lib/quickAddFlow';
import type { QuickAddServiceStatus } from '../../../types';
import { QuickAddStatusChoice } from '../../QuickAddStatusChoice';
import { GroupsShopSwitch } from './GroupsShopSwitch';

export interface GroupsFinishProps {
  supplierName: string;
  scope: 'all' | 'groups';
  groups: number;
  services: number;
  serviceStatus: QuickAddServiceStatus;
  onServiceStatus: (status: QuickAddServiceStatus) => void;
  shop: { checked: boolean; lock: string | undefined; onChange: (on: boolean) => void };
  rule: ShopRule;
  /** A big run asks for a tick box before Start. */
  needsConfirm: boolean;
  confirmed: boolean;
  onConfirmed: (confirmed: boolean) => void;
}

/** What is about to be added, the two choices, and the tick box a big run needs. */
export function GroupsFinish({
  supplierName,
  scope,
  groups,
  services,
  serviceStatus,
  onServiceStatus,
  shop,
  rule,
  needsConfirm,
  confirmed,
  onConfirmed,
}: GroupsFinishProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm font-medium" aria-live="polite">
        Ready to add {servicesText(services)} from {sourceText(scope, groups, supplierName)}.
      </p>
      <QuickAddStatusChoice name="groups-flow-status" value={serviceStatus} onChange={onServiceStatus} />
      <GroupsShopSwitch checked={shop.checked} lock={shop.lock} rule={rule} onChange={shop.onChange} />
      {needsConfirm && (
        <CheckboxField
          label={`I checked the groups. Add ${servicesText(services)}.`}
          checked={confirmed}
          onChange={(event) => onConfirmed(event.target.checked)}
        />
      )}
    </div>
  );
}
