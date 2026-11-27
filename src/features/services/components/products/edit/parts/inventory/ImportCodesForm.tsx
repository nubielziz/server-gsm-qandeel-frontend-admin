// ImportCodesForm: the "Import codes" section of the Inventory part: paste the codes of this service, one per line, or add a text file, and
// import them. The server finds the duplicates and the lines it cannot read; what it made of the import is told in place (no dialog).
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, FormRow, MoreOptions, TextareaField, TextField, useReportDirty } from '@/components/ui';
import { applyServerErrors, type Id } from '@/lib/api';
import { useImportCodes } from '../../../../../hooks/useInventory';
import { CODE_FILE_TYPES, codesText, readCodes } from '../../../../../lib/codes';
import { readTextFile } from '../../../../../lib/readFile';
import type { ImportCodesResult } from '../../../../../types';
import { importSummary } from './importSummary';

type Values = { codes: string; batchRef: string };

export interface ImportCodesFormProps {
  serviceId: Id;
  /** `disabled` with the missing permission in `title` when the staff member may not import (`inventory:write`). */
  lock: { disabled: boolean; title?: string };
  /** The pasted codes are unsaved work until they are imported. */
  onDirtyChange: (dirty: boolean) => void;
}

const FIELDS = ['codes', 'batchRef'] as const;

/**
 * Pasted codes that are not imported yet make the part dirty. A refused import keeps the codes in the box and puts the server's words
 * under the field they belong to; a good one empties the form and tells the counts.
 */
export function ImportCodesForm({ serviceId, lock, onDirtyChange }: ImportCodesFormProps) {
  const importCodes = useImportCodes();
  const [result, setResult] = useState<ImportCodesResult | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const form = useForm<Values>({ defaultValues: { codes: '', batchRef: '' } });
  const {
    register,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = form;
  const count = readCodes(watch('codes')).length;
  useReportDirty(count > 0, onDirtyChange);
  const title = lock.disabled ? lock.title : undefined;

  const submit = form.handleSubmit(async (values) => {
    setFailure(null);
    setResult(null);
    const batchRef = values.batchRef.trim();
    const codes = readCodes(values.codes);
    try {
      const answer = await importCodes.mutateAsync({
        serviceId,
        body: batchRef ? { codes, batchRef } : { codes },
      });
      setResult(answer);
      form.reset({ codes: '', batchRef: '' });
    } catch (error) {
      const rest = applyServerErrors(error, form.setError, { fields: FIELDS });
      if (rest.length > 0) setFailure(rest.join(' '));
    }
  });

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

  return (
    <form noValidate onSubmit={submit}>
      <TextareaField
        layout="row"
        label="Codes"
        rows={3}
        className="mono w-full max-w-2xl"
        spellCheck={false}
        placeholder="One code per line"
        disabled={lock.disabled}
        title={title}
        hint={count > 0 ? `${codesText(count)} ready.` : 'Paste the codes here, or add a file below.'}
        error={errors.codes}
        {...register('codes', {
          validate: (value) => readCodes(value).length > 0 || 'Add at least one code.',
        })}
      />
      <TextField
        layout="row"
        label="Text file"
        type="file"
        accept={CODE_FILE_TYPES}
        disabled={lock.disabled}
        title={title}
        hint="A .txt or .csv file, one code per line. Its lines are added under the codes above."
        error={fileError ?? undefined}
        onChange={(event) => {
          // The lines are in the box now, so the field is emptied: the same file can be chosen again.
          const input = event.currentTarget;
          void addFile(input.files?.[0]).then(() => {
            input.value = '';
          });
        }}
      />
      {/* The server makes a reference when none is typed, so the box is folded away (decision 035); an error keeps the fold open. */}
      <MoreOptions forceOpen={Boolean(errors.batchRef)} className="mb-2">
        <TextField
          layout="row"
          label="Batch reference"
          autoComplete="off"
          maxLength={40}
          disabled={lock.disabled}
          title={title}
          hint="Optional. A name for this delivery: letters, digits, dots, underscores and hyphens."
          error={errors.batchRef}
          {...register('batchRef')}
        />
      </MoreOptions>
      <FormRow label={null}>
        <div className="flex flex-wrap items-center gap-3">
          <span title={title} className="inline-flex">
            <Button type="submit" loading={isSubmitting} disabled={lock.disabled}>
              Import codes
            </Button>
          </span>
          {result && (
            <p role="status" className="text-sm text-ink2">
              {importSummary(result)}
            </p>
          )}
          {failure && (
            <p role="alert" className="text-sm text-crit-fg">
              {failure}
            </p>
          )}
        </div>
      </FormRow>
    </form>
  );
}
