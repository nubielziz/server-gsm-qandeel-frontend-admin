// The form behind the "Options" section of the edit view's Field part: the model, network and MEP lists of a service as one text box each,
// one entry per line (`value | label | supplier value`, lib/options.ts). A model list can have hundreds of entries, which text edits far
// faster than rows of inputs. Saving replaces all three lists together (`PUT /admin/services/:id/options`, through useReplaceOptions).
import { useForm } from 'react-hook-form';
import { dialogSubmit } from '@/components/ui';
import { blankValueLine, optionLines, parseOptionLines } from '../lib/options';
import { OPTION_LISTS } from '../lib/status';
import type { ServiceDetail, ServiceOption, ServiceOptionList } from '../types';
import { useReplaceOptions } from './useServicePartMutations';

/** The three boxes, as text, under the list's id. */
export type OptionsValues = Record<ServiceOptionList, string>;

/** The boxes filled with the lists the service has now. */
function optionDefaults(options: readonly ServiceOption[]): OptionsValues {
  return {
    model: optionLines(options, 'model'),
    network: optionLines(options, 'network'),
    mep: optionLines(options, 'mep'),
  };
}

/**
 * The form and its `submit` (plug it into a SectionForm). A line that has a label but no value is refused under its box with the line's
 * number, before any request. After a save the boxes keep what was typed as the new saved text, so an entry written without a label does
 * not change shape under the person's hands.
 */
export function useOptionsForm(service: ServiceDetail) {
  const replace = useReplaceOptions();
  const form = useForm<OptionsValues>({ defaultValues: optionDefaults(service.options) });

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
      form.reset(values);
    },
    { fields: OPTION_LISTS.map((list) => list.id) },
  );

  return { form, submit };
}
