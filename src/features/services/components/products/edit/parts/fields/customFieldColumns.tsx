// customFieldColumns: the columns of the Custom Fields table of the edit view's Field part. Every cell is an input of the section's form
// (registered under `fields.<row>.<name>`, so the server's field messages find their input), with its error line under it in the cell.
// The accessible names are "Name of field 2", "Field 2 is required" and so on, numbered from 1 in the buyer's order. A field has one
// visible name: the hidden key and the hidden pattern of a saved field live in the form's values and have no cell (decisions 024, 030).
import type { UseFormReturn } from 'react-hook-form';
import { Badge, Button, cx, Icon, SelectField, type DataTableColumn } from '@/components/ui';
import type { FieldsFormValues } from '../../../../../lib/fields';
import { FIELD_TYPE_OPTIONS } from '../../../../../lib/options';
import type { ServiceFieldType } from '../../../../../types';
import type { PermissionLock } from '@/components/ui';
import { TextCell } from './TextCell';

const INVALID = 'aria-[invalid=true]:border-crit-dot';

// What the switch of a row's main input says when nothing locks it.
const MAIN_INPUT_HINT =
  'The main input is the field the order itself is about, such as the IMEI; on an IMEI service the buyer types the IMEI in it. A service has at most one.';

/** A row of the table: the id React keys it by (the form's row id) and its place in the form's list. */
export type FieldRowRef = { id: string; index: number };

export interface CustomFieldColumnsArgs {
  form: UseFormReturn<FieldsFormValues>;
  /** The type each row has now, by position: only a choice list shows its choices box. */
  types: readonly (ServiceFieldType | undefined)[];
  /** Whether each row is the main input now, by position: that row shows the badge and its switch is pressed. */
  mainInputs: readonly (boolean | undefined)[];
  /** How many rows there are, so the last one cannot move down. */
  count: number;
  lock: PermissionLock;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  /** Turns the main input of a row on or off; turning it on turns it off for the others. */
  onMainInput: (index: number, on: boolean) => void;
}

/**
 * The six columns, left to right: the number, the name (the main input shows a badge beside it), the label, the type (a choice list
 * shows its choices under it), required and the row's buttons (the main input switch, up, down, remove).
 */
export function customFieldColumns({
  form,
  types,
  mainInputs,
  count,
  lock,
  onMove,
  onRemove,
  onMainInput,
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
      key: 'name',
      label: 'Name',
      render: ({ index }) => (
        <TextCell
          n={index + 1}
          label="Name"
          lock={lock}
          error={rowErrors?.[index]?.name?.message}
          trailing={mainInputs[index] ? <Badge tone="accent">Main input</Badge> : undefined}
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
      key: 'actions',
      label: 'Actions',
      render: ({ index }) => (
        <span className="inline-flex items-center">
          <Button
            size="sm"
            variant="ghost"
            icon
            aria-label={`Main input of field ${index + 1}`}
            aria-pressed={mainInputs[index] === true}
            title={lock.title ?? MAIN_INPUT_HINT}
            disabled={lock.disabled}
            onClick={() => onMainInput(index, mainInputs[index] !== true)}
          >
            <Icon name="inbox" className="ic-sm" />
          </Button>
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
