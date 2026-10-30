// PublishLegalDialog: the confirm step before a legal version goes in force (`POST /admin/legal-documents/:id/publish`). Ports
// the `lg-publish` confirm of 50-p-storefront.js: say what changes before the click, because the new text reaches every later
// consent. The version in force today comes from the rows already loaded; the server decides what the publish does.
import { ConfirmDialog } from '@/components/ui';
import { usePublishLegal } from '../hooks/useLegalMutations';
import { legalLanguage, legalTypeLabel } from '../lib/legal';
import type { LegalDocument } from '../types';

export interface PublishLegalDialogProps {
  document: LegalDocument;
  /** The version in force for the same document and language, if any. */
  inForce?: LegalDocument;
  onClose: () => void;
}

/** Confirm, then publish; a refusal shows in the dialog. */
export function PublishLegalDialog({ document, inForce, onClose }: PublishLegalDialogProps) {
  const publish = usePublishLegal();
  const name = `${legalTypeLabel(document.type)} (${legalLanguage(document.locale)})`;
  return (
    <ConfirmDialog
      open
      title="Publish a new version?"
      confirm={`Publish v${document.version}`}
      onClose={onClose}
      onConfirm={async () => {
        await publish.mutateAsync(document);
      }}
      body={
        <>
          <p>
            {name} {inForce ? `goes from v${inForce.version} to ` : 'goes in force as '}
            <strong>v{document.version}</strong> today.
          </p>
          <p className="mt-2">
            It appears in later consents
            {document.requiresReacceptance
              ? ', and customers are asked to accept it again at their next order'
              : ''}
            . Orders already placed keep the version they accepted.
          </p>
        </>
      }
    />
  );
}
