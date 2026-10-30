// LegalPanel: "Legal documents", the legal half of the Content and legal tab: the versions in force and the ones waiting to be
// published, the line of earlier versions, and the New version and Publish dialogs. Ports the legal panel of tabContent and
// `lg-publish` in 50-p-storefront.js.
import { useState } from 'react';
import { Button, Icon, Panel } from '@/components/ui';
import { useStorefrontList } from '../hooks/useStorefrontList';
import type { StorefrontGrants } from '../hooks/useStorefrontGrants';
import { groupLegal, legalLanguage, legalTypeLabel, versionInForce } from '../lib/legal';
import { WHOLE_LIST_CAP } from '../lib/views';
import type { LegalDocument } from '../types';
import { LegalTable } from './LegalTable';
import { LegalVersionDialog } from './LegalVersionDialog';
import { PublishLegalDialog } from './PublishLegalDialog';

type Dialog = { kind: 'new'; from?: LegalDocument } | { kind: 'publish'; document: LegalDocument };

/** The legal table, the earlier-versions line and the dialogs. */
export function LegalPanel({ grants }: { grants: StorefrontGrants }) {
  const list = useStorefrontList<LegalDocument>('legal-documents', {
    filters: [],
    page: 1,
    pageSize: WHOLE_LIST_CAP,
    sort: { field: 'type', order: 'asc' },
    enabled: grants.ready,
  });
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const create = grants.needs('legal:create');
  const publish = grants.needs('legal:publish');
  const groups = groupLegal(list.rows);

  return (
    <>
      <Panel
        title="Legal documents"
        sub="Every order stores which version the customer accepted. That record is what you send the card network when a customer disputes a charge."
        right={
          <Button
            size="sm"
            disabled={create.disabled}
            title={create.title}
            onClick={() => setDialog({ kind: 'new' })}
          >
            <Icon name="plus" className="ic-sm" />
            New version…
          </Button>
        }
        flush
      >
        <LegalTable
          rows={groups.shown}
          state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
          error={list.query.error}
          onRetry={() => void list.query.refetch()}
          createLock={create}
          publishLock={publish}
          onNewVersion={(document) => setDialog({ kind: 'new', from: document })}
          onPublish={(document) => setDialog({ kind: 'publish', document })}
        />
        {groups.earlier.length > 0 && (
          <p className="border-t border-line px-3.5 py-2.5 text-xs text-ink3">
            Earlier versions kept for the record:{' '}
            {groups.earlier
              .map(
                (d) =>
                  `${legalTypeLabel(d.type)} v${d.version} (${legalLanguage(d.locale)})` +
                  (d.acceptedCount ? `, accepted ${d.acceptedCount} times` : ''),
              )
              .join('; ')}
            .
          </p>
        )}
      </Panel>
      {dialog?.kind === 'new' && <LegalVersionDialog from={dialog.from} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'publish' && (
        <PublishLegalDialog
          document={dialog.document}
          inForce={versionInForce(list.rows, dialog.document)}
          onClose={() => setDialog(null)}
        />
      )}
    </>
  );
}
