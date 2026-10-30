// OptionsForm: the form of the Options dialog: the model, network and MEP lists of a service as one text box each, one entry per
// line (`value | label | supplier value`). A model list can have hundreds of entries, which text edits far faster than rows of
// inputs. Saving replaces all three lists together (`PUT /admin/services/:id/options`).
import { useForm } from 'react-hook-form';
import { dialogSubmit, FormDialog, TextareaField } from '@/components/ui';
import { useReplaceOptions } from '../hooks/useServicePartMutations';
import { blankValueLine, entriesText, optionLines, parseOptionLines } from '../lib/options';
import { OPTION_LISTS } from '../lib/status';
import type { Service, ServiceOption, ServiceOptionList } from '../types';

type Values = Record<ServiceOptionList, string>;

export interface OptionsFormProps {
  service: Service;
  saved: readonly ServiceOption[];
  onClose: () => void;
}

/** One text box per option list. */
export function OptionsForm({ service, saved, onClose }: OptionsFormProps) {
  const replace = useReplaceOptions();
  const form = useForm<Values>({
    defaultValues: {
      model: optionLines(saved, 'model'),
      network: optionLines(saved, 'network'),
      mep: optionLines(saved, 'mep'),
    },
  });
  const {
    register,
    watch,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      const options: ServiceOption[] = [];
      for (const list of OPTION_LISTS) {
        const blank = blankValueLine(values[list.id]);
        if (blank !== null) {
          form.setError(
            list.id,
            { type: 'validate', message: `Line ${blank} has no value.` },
            { shouldFocus: true },
          );
          return false;
        }
        options.push(...parseOptionLines(values[list.id], list.id));
      }
      await replace.mutateAsync({ service, body: { options } });
    },
    { fields: OPTION_LISTS.map((list) => list.id) },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="Options"
      sub={`${service.name}: the lists a buyer picks from`}
      confirm="Save options"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-4">
        <p className="text-sm text-ink2">
          One entry per line: <span className="mono">value | label | supplier value</span>. The label and the
          supplier value are optional; without a label the value is shown.
        </p>
        {OPTION_LISTS.map((list) => (
          <TextareaField
            key={list.id}
            label={list.label}
            rows={6}
            className="mono"
            spellCheck={false}
            hint={`${list.hint} ${entriesText(parseOptionLines(watch(list.id), list.id).length)}.`}
            error={errors[list.id]}
            {...register(list.id)}
          />
        ))}
      </div>
    </FormDialog>
  );
}
