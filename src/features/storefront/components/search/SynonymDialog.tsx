// SynonymDialog: "Add synonym" and "Edit synonym" (`POST` and `PATCH /admin/search/synonyms`): words and phrases that mean the same
// to a visitor (`frp` and `google account lock`), or a root that also finds other terms. The checks here only save a round trip;
// the server cleans the terms, decides what is valid and says so under the field. The Report tab opens it with a term filled in.
import { useController, useForm } from 'react-hook-form';
import { CheckboxField, dialogSubmit, FormDialog, RadioGroup, TextField, toast } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useCreateSynonym, useUpdateSynonym } from '../../hooks/useSearchMutations';
import { normaliseTerm, synonymProblems } from '../../lib/search';
import type { SearchSynonym, SynonymKind, UpdateSynonymBody } from '../../types';
import { TermChips } from './TermChips';

// The form calls the root `rootWord`: `root` is react-hook-form's own name for form-level errors and would clash with a field.
type Values = { kind: SynonymKind; rootWord: string; terms: string[]; note: string; isEnabled: boolean };

export interface SynonymDialogProps {
  /** The rule to edit; leave out to add one. */
  synonym?: SearchSynonym;
  /** A term to start the new rule with (from a no-result search in the report). */
  initialTerm?: string;
  onClose: () => void;
}

const KIND_OPTIONS = [
  { value: 'multi', label: 'Same meaning', description: 'Any of the terms finds all the others.' },
  {
    value: 'one_way',
    label: 'One way',
    description: 'A search for the root also finds the terms, but not the other way round.',
  },
];

const sameTerms = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((t, i) => t === b[i]);

/** Adds a synonym rule, or edits the one it is given. */
export function SynonymDialog({ synonym, initialTerm, onClose }: SynonymDialogProps) {
  const create = useCreateSynonym();
  const update = useUpdateSynonym();
  const start = initialTerm ? normaliseTerm(initialTerm) : '';
  const form = useForm<Values>({
    defaultValues: {
      kind: synonym?.kind ?? 'multi',
      rootWord: synonym?.root ?? '',
      terms: synonym?.terms ?? (start ? [start] : []),
      note: synonym?.note ?? '',
      isEnabled: synonym?.isEnabled ?? true,
    },
  });
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;
  const kind = watch('kind');
  const terms = useController({
    control,
    name: 'terms',
    rules: { validate: (value, all) => synonymProblems(all.kind, all.rootWord, value).terms ?? true },
  });

  const submit = dialogSubmit(
    form,
    async (values) => {
      const root = normaliseTerm(values.rootWord);
      const note = values.note.trim();
      if (!synonym) {
        await create.mutateAsync({
          kind: values.kind,
          ...(values.kind === 'one_way' ? { root } : {}),
          terms: values.terms,
          isEnabled: values.isEnabled,
          ...(note ? { note } : {}),
        });
        return;
      }
      const body: UpdateSynonymBody = {};
      if (values.kind !== synonym.kind) body.kind = values.kind;
      const nextRoot = values.kind === 'one_way' ? root : null;
      if (nextRoot !== synonym.root) body.root = nextRoot;
      if (!sameTerms(values.terms, synonym.terms)) body.terms = values.terms;
      if (note !== synonym.note) body.note = note;
      if (values.isEnabled !== synonym.isEnabled) body.isEnabled = values.isEnabled;
      if (Object.keys(body).length === 0) {
        toast({ kind: 'info', title: 'Nothing changed' });
        return;
      }
      await update.mutateAsync({ synonym, body });
    },
    { fields: ['kind', 'rootWord', 'terms', 'note', 'isEnabled'], aliases: { root: 'rootWord' } },
  );

  return (
    <FormDialog
      open
      title={synonym ? 'Edit synonym' : 'Add synonym'}
      sub={
        synonym
          ? `Created ${fmtDate(synonym.createdAt)}, last changed ${fmtDate(synonym.updatedAt)}. Changes reach the shop within a minute.`
          : 'Changes reach the shop within a minute.'
      }
      confirm={synonym ? 'Save changes' : 'Add synonym'}
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <RadioGroup legend="Kind" options={KIND_OPTIONS} {...register('kind')} highlight />
        {kind === 'one_way' && (
          <TextField
            label="Searching for"
            autoComplete="off"
            hint="The root. A visitor who types this also sees services that match the terms below."
            error={errors.rootWord}
            {...register('rootWord', {
              validate: (value, all) => synonymProblems(all.kind, value, all.terms).root ?? true,
            })}
          />
        )}
        <TermChips
          label={kind === 'one_way' ? 'Also finds' : 'Words and phrases that mean the same'}
          value={terms.field.value}
          onChange={terms.field.onChange}
          placeholder="Type a word or phrase, then press Enter"
          hint="Use what visitors type, such as frp or google account lock. Text is saved in lower case."
          error={errors.terms}
          autoFocus
        />
        <TextField
          label="Why (optional)"
          autoComplete="off"
          hint="A line for the next person who edits this rule. Every change is also written to the audit log."
          error={errors.note}
          {...register('note')}
        />
        <CheckboxField label="On: the shop uses this rule" {...register('isEnabled')} />
      </div>
    </FormDialog>
  );
}
