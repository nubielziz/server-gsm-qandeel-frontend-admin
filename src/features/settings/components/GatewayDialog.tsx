// GatewayDialog: "Add payment method" and "Edit <name>" (`POST` and `PATCH /admin/payment-gateways`). The demo's cards were read-only; the
// map adds this form. Only what changed is sent on an edit, and the secret is sent only when one is typed (it is write-only).
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, toast } from '@/components/ui';
import { sameDecimal } from '../lib/decimal';
import { useCreateGateway, useGroupNames, useUpdateGateway } from '../hooks/useGateways';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import type { CreateGatewayBody, PaymentGateway, UpdateGatewayBody } from '../types';
import { GatewayFields, type GatewayValues } from './GatewayFields';

const sameIds = (a: readonly number[], b: readonly number[]) =>
  a.length === b.length && [...a].sort().every((id, index) => id === [...b].sort()[index]);

const FIELD_NAMES = [
  'name',
  'code',
  'driver',
  'audience',
  'feePercent',
  'feeFixed',
  'minAmount',
  'maxAmount',
  'holdHours',
  'supportsRefunds',
  'supports3ds',
  'isManual',
  'isActive',
  'instructions',
  'secret',
];

/** The values of the form as a create body. */
function toBody(values: GatewayValues, allowedGroupIds: number[]): CreateGatewayBody {
  return {
    name: values.name.trim(),
    code: values.code.trim(),
    driver: values.driver.trim(),
    audience: values.audience,
    feePercent: values.feePercent.trim(),
    feeFixed: values.feeFixed.trim(),
    minAmount: values.minAmount.trim(),
    maxAmount: values.maxAmount.trim(),
    allowedGroupIds,
    supportsRefunds: values.supportsRefunds,
    supports3ds: values.supports3ds,
    isManual: values.isManual,
    instructions: values.instructions.trim(),
    holdHours: Number(values.holdHours),
    isActive: values.isActive,
    ...(values.secret ? { secret: values.secret } : {}),
  };
}

/** Only the fields of `next` that differ from the saved gateway. */
function changes(next: CreateGatewayBody, saved: PaymentGateway): UpdateGatewayBody {
  const body: UpdateGatewayBody = {};
  for (const key of [
    'name',
    'driver',
    'audience',
    'instructions',
    'holdHours',
    'supportsRefunds',
    'supports3ds',
    'isManual',
    'isActive',
  ] as const) {
    if (next[key] !== saved[key]) Object.assign(body, { [key]: next[key] });
  }
  for (const key of ['feePercent', 'feeFixed', 'minAmount', 'maxAmount'] as const) {
    if (!sameDecimal(next[key], saved[key])) body[key] = next[key];
  }
  if (!sameIds(next.allowedGroupIds, saved.allowedGroupIds)) body.allowedGroupIds = next.allowedGroupIds;
  if (next.secret) body.secret = next.secret;
  return body;
}

/** Adds a payment method, or edits the one it is given. */
export function GatewayDialog({ gateway, onClose }: { gateway?: PaymentGateway; onClose: () => void }) {
  const grants = useSettingsGrants();
  const canGroups = grants.can('groups:read');
  const groups = useGroupNames(canGroups);
  const create = useCreateGateway();
  const update = useUpdateGateway();
  const [groupIds, setGroupIds] = useState<number[]>(gateway?.allowedGroupIds ?? []);
  const form = useForm<GatewayValues>({
    defaultValues: {
      name: gateway?.name ?? '',
      code: gateway?.code ?? '',
      driver: gateway?.driver ?? '',
      audience: gateway?.audience ?? 'b2c',
      feePercent: gateway?.feePercent ?? '0',
      feeFixed: gateway?.feeFixed ?? '0',
      minAmount: gateway?.minAmount ?? '0',
      maxAmount: gateway?.maxAmount ?? '0',
      holdHours: String(gateway?.holdHours ?? 0),
      supportsRefunds: gateway?.supportsRefunds ?? false,
      supports3ds: gateway?.supports3ds ?? false,
      isManual: gateway?.isManual ?? false,
      isActive: gateway?.isActive ?? false,
      instructions: gateway?.instructions ?? '',
      secret: '',
    },
  });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = toBody(values, groupIds);
      if (!gateway) {
        await create.mutateAsync(next);
        return;
      }
      const body = changes(next, gateway);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ gateway, body });
    },
    // `allowedGroupIds` is not a form field (the ticks are state), so a message about it falls to the dialog's error slot.
    { fields: FIELD_NAMES },
  );

  return (
    <FormDialog
      open
      title={gateway ? `Edit ${gateway.name}` : 'Add payment method'}
      sub="How customers or merchants pay: the fee, the limits and who may use it."
      confirm={gateway ? 'Save changes' : 'Add payment method'}
      onClose={onClose}
      onSubmit={submit}
    >
      <GatewayFields form={form} gateway={gateway} />
      <fieldset className="mt-3 min-w-0">
        <legend className="label">Merchant groups</legend>
        {canGroups ? (
          <div className="space-y-1.5">
            {(groups.data ?? []).map((group) => (
              <CheckboxField
                key={group.id}
                label={group.name}
                checked={groupIds.includes(group.id)}
                onChange={(event) =>
                  setGroupIds((current) =>
                    event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id),
                  )
                }
              />
            ))}
            <p className="hint">
              {groups.isError
                ? 'Could not load the merchant groups. The method keeps the groups it has now.'
                : 'Leave all unticked to allow every group. Groups only matter for merchants (B2B).'}
            </p>
          </div>
        ) : (
          <p className="hint">
            You need the groups:read permission to choose groups. The method keeps the groups it has now.
          </p>
        )}
      </fieldset>
    </FormDialog>
  );
}
