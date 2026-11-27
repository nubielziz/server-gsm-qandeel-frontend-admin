// LegalVersionDialog: "New version" of a legal document (`POST /admin/legal-documents`). The demo's "New version…" published the
// next number at once (`publishLegal`); the map splits it in two, so this saves the version and the Publish button puts it in
// force. Started from a document it keeps that document's type and suggests its text. The version is not typed: it is the next free number
// for the chosen document over all its versions, drafts included, shown as a plain value and sent as it is (decision 036).
import { useForm, useWatch } from 'react-hook-form';
import {
  CheckboxField,
  dialogSubmit,
  FormDialog,
  SelectField,
  TextareaField,
  ReadField,
} from '@/components/ui';
import { useCreateLegal } from '../hooks/useLegalMutations';
import { LEGAL_TYPE_OPTIONS, legalTypeLabel, nextVersionFor } from '../lib/legal';
import type { LegalDocument } from '../types';

type Values = {
  type: string;
  /** Never typed: it only carries the server's message about the number, which is shown under its value. */
  version: string;
  bodyMd: string;
  requiresReacceptance: boolean;
};

export interface LegalVersionDialogProps {
  /** The document this is a new version of; leave out to start another document. */
  from?: LegalDocument;
  /** The versions the page has, so the next number of a document picked in the menu can be worked out. */
  documents: readonly LegalDocument[];
  onClose: () => void;
}

/** The form and its request. */
export function LegalVersionDialog({ from, documents, onClose }: LegalVersionDialogProps) {
  const create = useCreateLegal();
  const form = useForm<Values>({
    defaultValues: {
      type: from?.type ?? LEGAL_TYPE_OPTIONS[0].value,
      version: '',
      bodyMd: from?.bodyMd ?? '',
      requiresReacceptance: true,
    },
  });
  const {
    register,
    control,
    formState: { errors },
  } = form;
  const type = useWatch({ control, name: 'type' });
  // Always the number after the newest version of the chosen document, a draft included: the row the dialog was started from may be
  // the version in force while a later draft already holds the number after it, and the server refuses a number that exists (409).
  const version = nextVersionFor(documents, type);

  const submit = dialogSubmit(
    form,
    async (values) => {
      await create.mutateAsync({ ...values, version });
    },
    // The version has no input, but a message about it is shown under its value.
    { fields: ['type', 'version', 'bodyMd', 'requiresReacceptance'] },
  );

  return (
    <FormDialog
      open
      size="lg"
      title="New version"
      sub={
        from
          ? `${legalTypeLabel(from.type)} is at v${from.version}. The new version is saved but not in force until you publish it.`
          : 'The new version is saved but not in force until you publish it.'
      }
      confirm="Save version"
      onClose={onClose}
      onSubmit={submit}
    >
      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Document"
            selectWrapClassName="w-full"
            disabled={Boolean(from)}
            options={LEGAL_TYPE_OPTIONS}
            error={errors.type}
            {...register('type')}
          />
          <ReadField label="Version" mono error={errors.version?.message}>
            {version}
          </ReadField>
        </div>
        <TextareaField
          label="Text (Markdown)"
          className="mono"
          rows={10}
          spellCheck={false}
          autoFocus
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
