// customFieldColumns: the columns of the Custom Fields table of the edit view's Field part. Every cell is an input of the section's form
// (registered under `fields.<row>.<name>`, so the server's field messages find their input), with its error line under it in the cell.
// The accessible names are "Name of field 2", "Field 2 is required", "Main input of field 2" and so on, numbered from 1 in the buyer's
// order. A field has one visible name: the hidden key and the hidden pattern of a saved field live in the form's values and have no cell
// (decisions 024, 030). The main input is a tick box column after Required (decision 032); its tick boxes are registered too, so a server
// message about the flag shows on the box, and each points at the help line that says what the main input is (in "How this works").
import type { ChangeEvent } from 'react';
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
  /** Whether the Label column is drawn (the "Show buyers a different label" box); hidden, its inputs stay in the form with their values. */
  showLabels: boolean;
  /** How many rows there are, so the last one cannot move down. */
  count: number;
  lock: PermissionLock;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  /** The id of the help line about the main input (in "How this works"): every tick box of the column points at it (aria-describedby). */
  introId: string;
  /** Ticks or unticks the main input of a row; ticking it unticks the others, unticking leaves the service with none. */
  onMainInput: (index: number, on: boolean) => void;
}

/**
 * The columns, left to right: the number, the name, the label (only while `showLabels`, decision 035), the type (a choice list shows its
 * choices under it), required, the main input (a tick box, one row at most) and the row's buttons (up, down, remove).
 */
export function customFieldColumns({
  form,
  types,
  showLabels,
  count,
  lock,
  introId,
  onMove,
  onRemove,
  onMainInput,
}: CustomFieldColumnsArgs): DataTableColumn<FieldRowRef>[] {
  const { register } = form;
  const rowErrors = form.formState.errors.fields;
  const columns: DataTableColumn<FieldRowRef>[] = [
    {
      key: 'number',
      label: 'No.',
      render: ({ index }) => <span className="text-xs tabular-nums text-ink3">{index + 1}</span>,
    },
    {
      key: 'name',
      label: 'Name',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Name"
          lock={lock}
          error={rowErrors?.[index]?.name?.message}
          field={register(`fields.${index}.name`, {
            validate: (value) => value.trim() !== '' || 'Enter a name.',
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
          placeholder="Same as the name"
          error={rowErrors?.[index]?.label?.message}
          field={register(`fields.${index}.label`)}
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
      key: 'mainInput',
      label: 'Main input',
      className: 'w-px whitespace-nowrap',
      render: ({ index }) => {
        const message = rowErrors?.[index]?.isMainInput?.message;
        const errorId = `${introId}-error-${index}`;
        return (
          <>
            <input
              type="checkbox"
              className={cx('check', INVALID)}
              aria-label={`Main input of field ${index + 1}`}
              aria-describedby={message ? `${introId} ${errorId}` : introId}
              aria-invalid={message ? true : undefined}
              disabled={lock.disabled}
              title={lock.title}
              {...register(`fields.${index}.isMainInput`, {
                // Ticking a row unticks the others; the value of this row is already the box's by the time this runs.
                onChange: (event: ChangeEvent<HTMLInputElement>) => onMainInput(index, event.target.checked),
              })}
            />
            {message && (
              <span id={errorId} className="cell-sub w-32 whitespace-normal text-crit-fg">
                {message}
              </span>
            )}
          </>
        );
      },
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
  return showLabels ? columns : columns.filter((column) => column.key !== 'label');
}
