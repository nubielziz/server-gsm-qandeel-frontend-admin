// customFieldColumns: the columns of the Custom Fields table of the edit view's Field part. Every cell is an input of the section's form
// (registered under `fields.<row>.<name>`, so the server's field messages find their input), with its error line under it in the cell.
// The accessible names are "Key of field 2", "Field 2 is required" and so on, numbered from 1 in the buyer's order.
import type { UseFormReturn } from 'react-hook-form';
import { Button, cx, Icon, SelectField, type DataTableColumn } from '@/components/ui';
import type { FieldsFormValues } from '../../../../../lib/fields';
import { FIELD_TYPE_OPTIONS } from '../../../../../lib/options';
import type { ServiceFieldType } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';
import { TextCell } from './TextCell';

const INVALID = 'aria-[invalid=true]:border-crit-dot';

/** A row of the table: the id React keys it by (the form's row id) and its place in the form's list. */
export type FieldRowRef = { id: string; index: number };

export interface CustomFieldColumnsArgs {
  form: UseFormReturn<FieldsFormValues>;
  /** The type each row has now, by position: only a choice list shows its choices box. */
  types: readonly (ServiceFieldType | undefined)[];
  /** How many rows there are, so the last one cannot move down. */
  count: number;
  lock: PermissionLock;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/**
 * The eight columns, left to right: the number, the key, the label, the type (a choice list shows its choices under it), required, the
 * pattern, the supplier key and the row's buttons.
 */
export function customFieldColumns({
  form,
  types,
  count,
  lock,
  onMove,
  onRemove,
}: CustomFieldColumnsArgs): DataTableColumn<FieldRowRef>[] {
  const { register } = form;
  const rowErrors = form.formState.errors.fields;
  return [
    {
      key: 'number',
      label: 'No.',
      render: ({ index }) => <span className="text-xs tabular-nums text-ink3">{index + 1}</span>,
    },
    {
      key: 'key',
      label: 'Key',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Key"
          mono
          lock={lock}
          error={rowErrors?.[index]?.key?.message}
          field={register(`fields.${index}.key`, {
            validate: (value) => value.trim() !== '' || 'Enter a key.',
          })}
        />
      ),
    },
    {
      key: 'label',
      label: 'Label',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Label"
          lock={lock}
          error={rowErrors?.[index]?.label?.message}
          field={register(`fields.${index}.label`, {
            validate: (value) => value.trim() !== '' || 'Enter a label.',
          })}
        />
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: ({ index }) => (
        <>
          <SelectField
            aria-label={`Type of field ${index + 1}`}
            selectWrapClassName="select-wrap-sm w-full min-w-24"
            options={FIELD_TYPE_OPTIONS}
            disabled={lock.disabled}
            title={lock.title}
            error={rowErrors?.[index]?.fieldType?.message}
            {...register(`fields.${index}.fieldType`)}
          />
          {types[index] === 'select' && (
            <div className="mt-1">
              <TextCell
                n={index + 1}
                label="Choices"
                placeholder="Choices, separated by commas"
                lock={lock}
                error={rowErrors?.[index]?.choices?.message}
                field={register(`fields.${index}.choices`, {
                  validate: (value, values) =>
                    values.fields[index]?.fieldType !== 'select' ||
                    value.split(',').some((choice) => choice.trim() !== '') ||
                    'Enter at least one choice.',
                })}
              />
            </div>
          )}
        </>
      ),
    },
    {
      key: 'required',
      label: 'Required',
      render: ({ index }) => {
        const message = rowErrors?.[index]?.required?.message;
        return (
          <>
            <input
              type="checkbox"
              className={cx('check', INVALID)}
              aria-label={`Field ${index + 1} is required`}
              aria-invalid={message ? true : undefined}
              disabled={lock.disabled}
              title={lock.title}
              {...register(`fields.${index}.required`)}
            />
            {message && <span className="cell-sub text-crit-fg">{message}</span>}
          </>
        );
      },
    },
    {
      key: 'regex',
      label: 'Pattern',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Pattern"
          mono
          lock={lock}
          error={rowErrors?.[index]?.regex?.message}
          field={register(`fields.${index}.regex`)}
        />
      ),
    },
    {
      key: 'supplierKey',
      label: 'Supplier key',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Supplier key"
          mono
          lock={lock}
          error={rowErrors?.[index]?.supplierKey?.message}
          field={register(`fields.${index}.supplierKey`)}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: ({ index }) => (
        <span className="inline-flex items-center">
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label={`Move field ${index + 1} up`}
            title={lock.title}
            disabled={lock.disabled || index === 0}
            onClick={() => onMove(index, index - 1)}
          >
            <Icon name="arrowUp" className="ic-sm" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label={`Move field ${index + 1} down`}
            title={lock.title}
            disabled={lock.disabled || index === count - 1}
            onClick={() => onMove(index, index + 1)}
          >
            <Icon name="arrowDown" className="ic-sm" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label={`Remove field ${index + 1}`}
            title={lock.title}
            disabled={lock.disabled}
            onClick={() => onRemove(index)}
          >
            <Icon name="x" className="ic-sm" />
          </Button>
        </span>
      ),
    },
  ];
}
