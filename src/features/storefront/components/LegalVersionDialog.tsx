// LegalVersionDialog: "New version" of a legal document (`POST /admin/legal-documents`). The demo's "New version…" published the
// next number at once (`publishLegal`); the map splits it in two, so this saves the version and the Publish button puts it in
// force. Started from a document it keeps that document's type and language and suggests the next number and its text.
import { useForm } from 'react-hook-form';
import {
  CheckboxField,
  dialogSubmit,
  FormDialog,
  SelectField,
  TextareaField,
  TextField,
} from '@/components/ui';
import { useCreateLegal } from '../hooks/useLegalMutations';
import { LOCALE_OPTIONS } from '../lib/kinds';
import { LEGAL_TYPE_OPTIONS, legalLanguage, legalTypeLabel, suggestNextVersion } from '../lib/legal';
import type { LegalDocument } from '../types';

type Values = {
  type: string;
  locale: string;
  version: string;
  bodyMd: string;
  requiresReacceptance: boolean;
};

export interface LegalVersionDialogProps {
  /** The document this is a new version of; leave out to start another document. */
  from?: LegalDocument;
  onClose: () => void;
}

/** The form and its request. */
export function LegalVersionDialog({ from, onClose }: LegalVersionDialogProps) {
  const create = useCreateLegal();
  const form = useForm<Values>({
    defaultValues: {
      type: from?.type ?? LEGAL_TYPE_OPTIONS[0].value,
      locale: from?.locale ?? 'en',
      version: from ? suggestNextVersion(from.version) : '',
      bodyMd: from?.bodyMd ?? '',
      requiresReacceptance: true,
    },
  });
  const {
    register,
    formState: { errors },
  } = form;

  const submit = dialogSubmit(
    form,
    async (values) => {
      await create.mutateAsync({ ...values, version: values.version.trim() });
    },
    { fields: ['type', 'locale', 'version', 'bodyMd', 'requiresReacceptance'] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="New version"
      sub={
        from
          ? `${legalTypeLabel(from.type)} (${legalLanguage(from.locale)}) is at v${from.version}. The new version is saved but not in force until you publish it.`
          : 'The new version is saved but not in force until you publish it.'
      }
      confirm="Save version"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label="Document"
            selectWrapClassName="w-full"
            disabled={Boolean(from)}
            options={LEGAL_TYPE_OPTIONS}
            error={errors.type}
            {...register('type')}
          />
          <SelectField
            label="Language"
            selectWrapClassName="w-full"
            disabled={Boolean(from)}
            options={LOCALE_OPTIONS}
            error={errors.locale}
            {...register('locale')}
          />
          <TextField
            label="Version"
            className="mono"
            autoComplete="off"
            autoFocus
            error={errors.version}
            {...register('version', {
              validate: (value) => value.trim() !== '' || 'Enter a version number.',
            })}
          />
        </div>
        <TextareaField
          label="Text (Markdown)"
          className="mono"
          rows={10}
          spellCheck={false}
          error={errors.bodyMd}
          {...register('bodyMd', {
            validate: (value) => value.trim() !== '' || 'Enter the text of the document.',
          })}
        />
        <CheckboxField
          label="Customers must accept it again at their next order"
          error={errors.requiresReacceptance}
          {...register('requiresReacceptance')}
        />
      </div>
    </FormDialog>
  );
}
