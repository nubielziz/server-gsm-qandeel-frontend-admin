// ImportCodesDialog: "Import codes" for one service (`POST /admin/services/:id/inventory/import`): paste the codes, one per line, or
// upload a text file. The server finds the duplicates and the lines it cannot read, and the dialog that follows shows its counts.
// The map adds this action; the demo had no code stock.
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, SelectField, TextareaField, TextField } from '@/components/ui';
import { useServiceChoices } from '../hooks/useChoices';
import { useImportCodes } from '../hooks/useInventory';
import { CODE_FILE_TYPES, codesText, readCodes } from '../lib/codes';
import { readTextFile } from '../lib/readFile';
import { withChosen } from '../lib/select';
import type { ImportCodesResult } from '../types';
import { ImportResultDialog } from './ImportResultDialog';
import { LookupNote } from './LookupNote';

type Values = { serviceId: string; codes: string; batchRef: string };

export interface ImportCodesDialogProps {
  /** The service chosen in the filter, to start from. */
  serviceId: number | null;
  onClose: () => void;
}

/** Paste or upload, then show the server's counts in a second dialog. */
export function ImportCodesDialog({ serviceId, onClose }: ImportCodesDialogProps) {
  const services = useServiceChoices();
  const importCodes = useImportCodes();
  const [result, setResult] = useState<{ result: ImportCodesResult; serviceName: string } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const form = useForm<Values>({
    defaultValues: { serviceId: serviceId === null ? '' : String(serviceId), codes: '', batchRef: '' },
  });
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const codes = readCodes(values.codes);
      const batchRef = values.batchRef.trim();
      const body = batchRef ? { codes, batchRef } : { codes };
      const answer = await importCodes.mutateAsync({ serviceId: Number(values.serviceId), body });
      const name = services.data?.find((service) => String(service.id) === values.serviceId)?.name;
      setResult({ result: answer, serviceName: name ?? `Service ${values.serviceId}` });
      // The counts open in their own dialog, so this one stays put until it is replaced.
      return false;
    },
    { fields: ['serviceId', 'codes', 'batchRef'] },
  );

  // A file adds its lines under what is already typed, so a second file does not wipe the first.
  async function addFile(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    try {
      const text = await readTextFile(file);
      const current = form.getValues('codes');
      setValue('codes', current.trim() === '' ? text : `${current.replace(/\s+$/, '')}\n${text}`, {
        shouldValidate: true,
      });
    } catch {
      setFileError('Could not read that file. Use a text file with one code per line.');
    }
  }

  if (result)
    return <ImportResultDialog result={result.result} serviceName={result.serviceName} onClose={onClose} />;
  const count = readCodes(watch('codes')).length;
  return (
    <FormDialog
      open
      size="lg"
      title="Import codes"
      sub="Add codes to a service's stock. The server skips the ones it already has."
      confirm={count > 0 ? `Import ${codesText(count)}` : 'Import codes'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <SelectField
          label="Service"
          selectWrapClassName="w-full"
          options={withChosen(
            [
              { value: '', label: services.isLoading ? 'Loading…' : 'Choose a service' },
              ...(services.data ?? []).map((service) => ({ value: service.id, label: service.name })),
            ],
            watch('serviceId'),
            `Service ${watch('serviceId')}`,
          )}
          error={errors.serviceId}
          {...register('serviceId', { validate: (value) => /^\d+$/.test(value) || 'Choose a service.' })}
          value={watch('serviceId')}
        />
        <LookupNote what="the services" query={services} />
        <TextareaField
          label="Codes"
          rows={8}
          className="mono"
          spellCheck={false}
          placeholder="One code per line"
          hint={count > 0 ? `${codesText(count)} ready.` : 'Paste the codes here, or upload a file below.'}
          error={errors.codes}
          {...register('codes', {
            validate: (value) => readCodes(value).length > 0 || 'Add at least one code.',
          })}
        />
        <TextField
          label="Or upload a text file"
          type="file"
          accept={CODE_FILE_TYPES}
          hint="A .txt or .csv file with one code per line."
          error={fileError ?? undefined}
          onChange={(event) => void addFile(event.target.files?.[0])}
        />
        <TextField
          label="Batch reference"
          autoComplete="off"
          maxLength={60}
          hint="Optional. A name for this delivery, such as the supplier's invoice number."
          error={errors.batchRef}
          {...register('batchRef')}
        />
      </div>
    </FormDialog>
  );
}
