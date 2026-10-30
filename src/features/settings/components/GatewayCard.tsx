// GatewayCard: one payment method as a card with its switch, fees, limits and merchant groups. Ports gatewayCard of 55-p-settings.js.
// The map adds Edit and Delete (the demo's cards were read-only) and the write-only secret behind the gateway.
import { Badge, Button, Icon, KeyValue, Switch, TypeTag } from '@/components/ui';
import { money0 } from '@/lib/format';
import { AUDIENCE_LABEL, feeText, groupsText, limitsText, modeLabel } from '../lib/gateways';
import type { PaymentGateway } from '../types';

export interface GatewayCardProps {
  gateway: PaymentGateway;
  /** Names for the merchant groups; undefined while they load or when the staff member cannot read them. */
  groups: readonly { id: number; name: string }[] | undefined;
  /** What the staff member may do, as props for the controls (`disabled` and the reason). */
  locks: { update: { disabled: boolean; title?: string }; remove: { disabled: boolean; title?: string } };
  /** True while this card's switch is being saved. */
  saving: boolean;
  onToggle: (on: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}

/** A payment method card. */
export function GatewayCard({
  gateway,
  groups,
  locks,
  saving,
  onToggle,
  onEdit,
  onDelete,
}: GatewayCardProps) {
  const manual = modeLabel(gateway) === 'Manual';
  return (
    <article className="panel p-3.5" aria-label={gateway.name}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{gateway.name}</h3>
            <TypeTag>{AUDIENCE_LABEL[gateway.audience]}</TypeTag>
            <Badge tone={manual ? 'neutral' : 'good'} icon={manual ? 'file' : 'bolt'}>
              {modeLabel(gateway)}
            </Badge>
          </div>
          {gateway.instructions && <p className="mt-1 text-sm text-ink2">{gateway.instructions}</p>}
        </div>
        <Switch
          checked={gateway.isActive}
          label={`${gateway.isActive ? 'Turn off' : 'Turn on'} ${gateway.name}`}
          disabled={locks.update.disabled || saving}
          title={locks.update.title}
          onChange={onToggle}
        />
      </div>
      <KeyValue
        rows={[
          ['Driver', gateway.driver],
          ['Fee', feeText(gateway)],
          ['Limits', limitsText(gateway)],
          ['Refunds', gateway.supportsRefunds ? 'Sent back automatically' : 'By hand'],
          ['3D Secure', gateway.supports3ds ? 'Required' : 'Not applicable'],
          gateway.audience !== 'b2c' && ['Merchant groups', groupsText(gateway.allowedGroupIds, groups)],
          gateway.holdHours > 0 && ['Held for', `${gateway.holdHours} hours`],
          ['Secret', gateway.secretHint ?? <span className="text-ink3">None stored</span>],
          [
            'Volume, 30 days',
            gateway.volume30d && Number(gateway.volume30d) > 0 ? (
              money0(gateway.volume30d)
            ) : (
              <span className="text-ink3">–</span>
            ),
          ],
        ]}
      />
      <div className="mt-3 flex justify-end gap-1.5">
        <Button
          size="sm"
          aria-label={`Edit ${gateway.name}`}
          disabled={locks.update.disabled}
          title={locks.update.title}
          onClick={onEdit}
        >
          <Icon name="edit" className="ic-xs" />
          Edit
        </Button>
        <Button
          size="sm"
          variant="danger"
          aria-label={`Delete ${gateway.name}`}
          disabled={locks.remove.disabled}
          title={locks.remove.title}
          onClick={onDelete}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
