// FieldRow: one custom field in the Fields dialog: key, label, type, required, the choices of a choice list, a pattern and the
// supplier's key for it, with buttons to move it up or down and to remove it. Its position in the list is its order in the form.
import type { UseFormReturn } from 'react-hook-form';
import { Button, CheckboxField, Icon, SelectField, TextField } from '@/components/ui';
import type { FieldsFormValues } from '../lib/fields';
import { FIELD_TYPE_OPTIONS } from '../lib/options';

export interface FieldRowProps {
  index: number;
  count: number;
  form: UseFormReturn<FieldsFormValues>;
  onMove: (from: number, to: number) => void;
  onRemove: (index: number) => void;
}

/** One field of the Fields form, registered under `fields.<index>`. */
export function FieldRow({ index, count, form, onMove, onRemove }: FieldRowProps) {
  const {
    register,
    watch,
    formState: { errors },
  } = form;
  const own = errors.fields?.[index];
  const number = index + 1;
  return (
    <li className="space-y-3 rounded-md border border-line p-3">
      <div className="flex items-center gap-1">
        <h3 className="flex-1 text-sm font-medium">Field {number}</h3>
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Move field ${number} up`}
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <Icon name="chevU" className="ic-sm" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Move field ${number} down`}
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <Icon name="chevD" className="ic-sm" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          icon
          aria-label={`Remove field ${number}`}
          onClick={() => onRemove(index)}
        >
          <Icon name="x" className="ic-sm" />
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Key"
          className="mono"
          aria-label={`Key of field ${number}`}
          autoComplete="off"
          spellCheck={false}
          error={own?.key}
          {...register(`fields.${index}.key`, {
            validate: (value) => value.trim() !== '' || 'Enter a key.',
          })}
        />
        <TextField
          label="Label"
          aria-label={`Label of field ${number}`}
          autoComplete="off"
          error={own?.label}
          {...register(`fields.${index}.label`, {
            validate: (value) => value.trim() !== '' || 'Enter a label.',
          })}
        />
      </div>
      <div className="grid items-end gap-3 sm:grid-cols-2">
        <SelectField
          label="Type"
          aria-label={`Type of field ${number}`}
          selectWrapClassName="w-full"
          options={FIELD_TYPE_OPTIONS}
          error={own?.fieldType}
          {...register(`fields.${index}.fieldType`)}
        />
        <CheckboxField
          label="Required"
          aria-label={`Field ${number} is required`}
          error={own?.required}
          {...register(`fields.${index}.required`)}
        />
      </div>
      {watch(`fields.${index}.fieldType`) === 'select' && (
        <TextField
          label="Choices"
          aria-label={`Choices of field ${number}`}
          hint="Separate the choices with commas."
          autoComplete="off"
          error={own?.choices}
          {...register(`fields.${index}.choices`, {
            validate: (value, values) =>
              values.fields[index]?.fieldType !== 'select' ||
              value.split(',').some((choice) => choice.trim() !== '') ||
              'Enter at least one choice.',
          })}
        />
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Pattern"
          className="mono"
          aria-label={`Pattern of field ${number}`}
          hint="A regular expression the answer must match. Optional."
          autoComplete="off"
          spellCheck={false}
          error={own?.regex}
          {...register(`fields.${index}.regex`)}
        />
        <TextField
          label="Supplier key"
          className="mono"
          aria-label={`Supplier key of field ${number}`}
          hint="The name the supplier uses for this field. Optional."
          autoComplete="off"
          spellCheck={false}
          error={own?.supplierKey}
          {...register(`fields.${index}.supplierKey`)}
        />
      </div>
    </li>
  );
}
