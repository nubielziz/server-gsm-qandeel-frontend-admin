// EditPriceDialog: "Edit price" for one service (`PATCH /admin/services/:id`). Ports editPrice of 43-p-services.js. The demo worked out the
// profit, the margin and "below the floor" while the admin typed; the console does no pricing maths (MISMATCHES M92). It shows the floor
// the server last worked out, sends the price and the minimum profit, and the toast after saving gives the floor and the margin the
// server now returns. A price the server refuses (under the floor) shows under the field.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, KeyValue, TextField, toast } from '@/components/ui';
import { money } from '@/lib/format';
import { useUpdatePrice } from '../hooks/useServiceMutations';
import { isMoneyText, moneyInput, sameMoney, toMoneyText } from '../lib/money';
import type { Service, UpdateServiceBody } from '../types';

type Values = { basePrice: string; minProfit: string };

export interface EditPriceDialogProps {
  service: Service;
  onClose: () => void;
}

/** The form and its request; a refused price shows under the field. */
export function EditPriceDialog({ service, onClose }: EditPriceDialogProps) {
  const update = useUpdatePrice();
  const form = useForm<Values>({
    defaultValues: { basePrice: moneyInput(service.basePrice), minProfit: moneyInput(service.minProfit) },
  });
  const {
    register,
    formState: { errors },
  } = form;

  // Only what changed is sent, so a price with more decimals than the box shows is never rounded by a save.
  const submit = dialogSubmit(
    form,
    async (values) => {
      const body: UpdateServiceBody = {};
      if (!sameMoney(values.basePrice, service.basePrice)) body.basePrice = toMoneyText(values.basePrice);
      if (!sameMoney(values.minProfit, service.minProfit)) body.minProfit = toMoneyText(values.minProfit);
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ service, body });
    },
    { fields: ['basePrice', 'minProfit'] },
  );

  return (
    <FormDialog
      open
      title="Edit price"
      sub={
        <>
          {service.name} <span className="mono text-ink3">{service.code}</span>
        </>
      }
      confirm="Save price"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <KeyValue
          className="!grid-cols-[130px_1fr]"
          rows={[
            [
              'Supplier cost',
              <span key="cost" className="tabular-nums">
                {money(service.cost)}
                {service.costChangedFrom && (
                  <span className="text-warn-fg"> (was {money(service.costChangedFrom)})</span>
                )}
              </span>,
            ],
            [
              'Floor',
              <span key="floor" className="font-medium tabular-nums">
                {money(service.floorPrice)}
              </span>,
            ],
          ]}
        />
        <TextField
          label="Base price (USD)"
          inputMode="decimal"
          autoComplete="off"
          autoFocus
          error={errors.basePrice}
          {...register('basePrice', {
            validate: (value) =>
              (isMoneyText(value) && Number(value) > 0) || 'Enter a price greater than zero.',
          })}
        />
        <TextField
          label="Minimum profit (USD)"
          inputMode="decimal"
          autoComplete="off"
          hint="The floor is the supplier cost plus this amount. The server works it out when you save."
          error={errors.minProfit}
          {...register('minProfit', {
            validate: (value) => isMoneyText(value) || 'Enter an amount, 0 or more.',
          })}
        />
      </div>
    </FormDialog>
  );
}
