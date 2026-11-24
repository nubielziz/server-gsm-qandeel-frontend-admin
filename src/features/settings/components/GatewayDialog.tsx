// GatewayDialog: "Add payment method" (custom, or filled from a ready-made one) and "Edit <name>" (`POST` and `PATCH /admin/payment-gateways`).
// The demo's cards were read-only; the map adds this form. Only what changed is sent on an edit, and the secrets are sent only when typed (they
// are write-only); the second webhook secret goes as `null` when it is removed. An edit also has the Logo field (feature 32, backend B232).
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, toast } from '@/components/ui';
import { sameDecimal } from '../lib/decimal';
import { useCreateGateway, useRankNames, useUpdateGateway } from '../hooks/useGateways';
import { useSettingsGrants } from '../hooks/useSettingsGrants';
import type { CreateGatewayBody, GatewayPreset, PaymentGateway, UpdateGatewayBody } from '../types';
import { GatewayFields, type GatewayValues } from './GatewayFields';
import { GatewayLogoField } from './GatewayLogoField';

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
  'webhookSecret',
  'secondaryWebhookSecret',
];

/** The values of the form as a create body; `preset` is the key of the ready-made method it was filled from. */
function toBody(values: GatewayValues, allowedGroupIds: number[], preset?: string): CreateGatewayBody {
  // A pasted secret with stray whitespace would fail every webhook signature check, and a blank one must not replace the real secret.
  const firstWebhookSecret = values.webhookSecret.trim();
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
    ...(preset ? { preset } : {}),
    ...(values.secret ? { secret: values.secret } : {}),
    // Webhook secrets only exist for a gateway that confirms by webhook; a manual one never sends them.
    ...(!values.isManual && firstWebhookSecret ? { webhookSecret: firstWebhookSecret } : {}),
    ...(!values.isManual && !values.secondaryRemoved && values.secondaryWebhookSecret.trim()
      ? { secondaryWebhookSecret: values.secondaryWebhookSecret.trim() }
      : {}),
  };
}

/** `null` asks the server to remove the stored second webhook secret; the control is offered only when one is stored. */
const secondaryRemoval = (values: GatewayValues, saved: PaymentGateway) =>
  !values.isManual && values.secondaryRemoved && Boolean(saved.secondaryWebhookSecretHint);

/** Only the fields of `next` that differ from the saved gateway. */
function changes(next: CreateGatewayBody, saved: PaymentGateway, values: GatewayValues): UpdateGatewayBody {
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
  if (next.webhookSecret) body.webhookSecret = next.webhookSecret;
  if (next.secondaryWebhookSecret) body.secondaryWebhookSecret = next.secondaryWebhookSecret;
  else if (secondaryRemoval(values, saved)) body.secondaryWebhookSecret = null;
  return body;
}

/** A ready-made method to start from, with the free code the tab made from its key. */
export type PresetStart = { preset: GatewayPreset; code: string };

/**
 * Adds a payment method, or edits the one it is given. With `start` the form is filled from the ready-made method (name, code, driver,
 * manual, instructions) for staff to complete, and `preset` is sent with the body.
 */
export function GatewayDialog({
  gateway,
  start,
  onClose,
}: {
  gateway?: PaymentGateway;
  start?: PresetStart;
  onClose: () => void;
}) {
  const grants = useSettingsGrants();
  const canRanks = grants.can('groups:read');
  const ranks = useRankNames(canRanks);
  const create = useCreateGateway();
  const update = useUpdateGateway();
  const [rankIds, setRankIds] = useState<number[]>(gateway?.allowedGroupIds ?? []);
  const form = useForm<GatewayValues>({
    defaultValues: {
      name: gateway?.name ?? start?.preset.name ?? '',
      code: gateway?.code ?? start?.code ?? '',
      driver: gateway?.driver ?? start?.preset.driver ?? '',
      // A ready-made method starts for both: a manual transfer tops up a merchant's wallet and a customer's store balance alike.
      audience: gateway?.audience ?? (start ? 'both' : 'b2c'),
      feePercent: gateway?.feePercent ?? '0',
      feeFixed: gateway?.feeFixed ?? '0',
      minAmount: gateway?.minAmount ?? '0',
      maxAmount: gateway?.maxAmount ?? '0',
      holdHours: String(gateway?.holdHours ?? 0),
      supportsRefunds: gateway?.supportsRefunds ?? false,
      supports3ds: gateway?.supports3ds ?? false,
      isManual: gateway?.isManual ?? start?.preset.kind === 'manual',
      isActive: gateway?.isActive ?? false,
      instructions: gateway?.instructions ?? start?.preset.instructions ?? '',
      secret: '',
      webhookSecret: '',
      secondaryWebhookSecret: '',
      secondaryRemoved: false,
    },
  });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = toBody(values, rankIds, start?.preset.key);
      if (!gateway) {
        await create.mutateAsync(next);
        return;
      }
      const body = changes(next, gateway, values);
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
      title={gateway ? `Edit ${gateway.name}` : start ? `Add ${start.preset.name}` : 'Add payment method'}
      sub={
        start
          ? 'Fill in your account details where the instructions show a blank (________), then turn it on.'
          : 'How customers or merchants pay: the fee, the limits and who may use it.'
      }
      confirm={gateway ? 'Save changes' : 'Add payment method'}
      onClose={onClose}
      onSubmit={submit}
    >
      {gateway && (
        <div className="mb-3">
          <GatewayLogoField gateway={gateway} />
        </div>
      )}
      <GatewayFields
        form={form}
        gateway={gateway}
        presetMade={Boolean(gateway?.preset) || start !== undefined}
      />
      <fieldset className="mt-3 min-w-0">
        <legend className="label">Ranks</legend>
        {canRanks ? (
          <div className="space-y-1.5">
            {(ranks.data ?? []).map((rank) => (
              <CheckboxField
                key={rank.id}
                label={rank.name}
                checked={rankIds.includes(rank.id)}
                onChange={(event) =>
                  setRankIds((current) =>
                    event.target.checked ? [...current, rank.id] : current.filter((id) => id !== rank.id),
                  )
                }
              />
            ))}
            <p className="hint">
              {ranks.isError
                ? 'Could not load the ranks. The method keeps the ranks it has now.'
                : 'Leave all unticked to allow every rank. Ranks only matter for merchants (B2B).'}
            </p>
          </div>
        ) : (
          <p className="hint">
            You need the groups:read permission to choose ranks. The method keeps the ranks it has now.
          </p>
        )}
      </fieldset>
    </FormDialog>
  );
}
