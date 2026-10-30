// TacDialog: "Add TAC" and "Edit TAC" (`POST` and `PATCH /admin/tac-catalog`): the first 8 digits of an IMEI, with the brand,
// the model code, the name customers know and the release year. The TAC catalogue is a tab the map adds; the demo kept the
// table inside its IMEI checker. The 8-digit check is a hint; the server also refuses a prefix that is already there.
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextField, toast } from '@/components/ui';
import { useCreateTac, useUpdateTac } from '../hooks/useTacMutations';
import { isTacPrefix, isYear } from '../lib/tac';
import type { TacEntry, UpdateTacBody } from '../types';

type Values = { tac: string; brand: string; model: string; marketingName: string; releaseYear: string };

export interface TacDialogProps {
  /** The entry to edit; leave out to add one. */
  entry?: TacEntry;
  onClose: () => void;
}

/** Adds a TAC, or edits the one it is given. */
export function TacDialog({ entry, onClose }: TacDialogProps) {
  const create = useCreateTac();
  const update = useUpdateTac();
  const form = useForm<Values>({
    defaultValues: {
      tac: entry?.tac ?? '',
      brand: entry?.brand ?? '',
      model: entry?.model ?? '',
      marketingName: entry?.marketingName ?? '',
      releaseYear: entry?.releaseYear ? String(entry.releaseYear) : '',
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const next = {
        tac: values.tac.trim(),
        brand: values.brand.trim(),
        model: values.model.trim(),
        marketingName: values.marketingName.trim(),
        releaseYear: values.releaseYear.trim() ? Number(values.releaseYear) : undefined,
      };
      if (!entry) {
        await create.mutateAsync({
          tac: next.tac,
          brand: next.brand,
          model: next.model,
          ...(next.marketingName ? { marketingName: next.marketingName } : {}),
          ...(next.releaseYear ? { releaseYear: next.releaseYear } : {}),
        });
        return;
      }
      const body: UpdateTacBody = {};
      if (next.tac !== entry.tac) body.tac = next.tac;
      if (next.brand !== entry.brand) body.brand = next.brand;
      if (next.model !== entry.model) body.model = next.model;
      if (next.marketingName !== entry.marketingName) body.marketingName = next.marketingName;
      if (next.releaseYear && next.releaseYear !== entry.releaseYear) body.releaseYear = next.releaseYear;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ entry, body });
    },
    { fields: ['tac', 'brand', 'model', 'marketingName', 'releaseYear'] },
  );

  return (
    <FormDialog
      open
      title={entry ? `Edit TAC ${entry.tac}` : 'Add TAC'}
      sub="The first 8 digits of an IMEI tell which phone it is."
      confirm={entry ? 'Save changes' : 'Add TAC'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <TextField
          label="TAC (8 digits)"
          className="mono"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          autoFocus
          hint="Dial *#06# on the phone to see its IMEI; the TAC is the first 8 digits."
          error={errors.tac}
          {...register('tac', { validate: (value) => isTacPrefix(value) || 'Enter exactly 8 digits.' })}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Brand"
            autoComplete="off"
            error={errors.brand}
            {...register('brand', { validate: (value) => value.trim() !== '' || 'Enter the brand.' })}
          />
          <TextField
            label="Model code"
            className="mono"
            autoComplete="off"
            hint="Such as A2633."
            error={errors.model}
            {...register('model', { validate: (value) => value.trim() !== '' || 'Enter the model code.' })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Name customers know"
            autoComplete="off"
            hint="Such as iPhone 13."
            error={errors.marketingName}
            {...register('marketingName')}
          />
          <TextField
            label="Release year"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            error={errors.releaseYear}
            {...register('releaseYear', {
              validate: (value) => value.trim() === '' || isYear(value) || 'Enter a 4-digit year.',
            })}
          />
        </div>
      </div>
    </FormDialog>
  );
}
