// LegalTable: the legal documents table (document and language, version, in force since, accepted at checkout, the action). Ports
// `lcols` of tabContent in 50-p-storefront.js. A version in force offers "New version…"; one written and not yet published offers
// Publish. It only draws what it is given; the panel owns data and dialogs.
import { Badge, Button, DataTable, EmptyState, type DataTableColumn } from '@/components/ui';
import { fmtDay, num } from '@/lib/format';
import { legalLanguage, legalTypeLabel } from '../lib/legal';
import type { LegalDocument } from '../types';

export interface LegalTableProps {
  rows: readonly LegalDocument[];
  state: 'loading' | 'error' | 'ready';
  error?: unknown;
  onRetry?: () => void;
  /** Props for the buttons when the staff member lacks `legal:create`. */
  createLock: { disabled: boolean; title?: string };
  /** Props for the Publish button when the staff member lacks `legal:publish`. */
  publishLock: { disabled: boolean; title?: string };
  onNewVersion: (document: LegalDocument) => void;
  onPublish: (document: LegalDocument) => void;
}

/** Draws the rows it is given, with the demo's columns. */
export function LegalTable({
  rows,
  state,
  error,
  onRetry,
  createLock,
  publishLock,
  onNewVersion,
  onPublish,
}: LegalTableProps) {
  const columns: DataTableColumn<LegalDocument>[] = [
    {
      key: 'type',
      label: 'Document',
      render: (d) => (
        <>
          <p className="font-medium">{legalTypeLabel(d.type)}</p>
          <p className="text-2xs text-ink3">{legalLanguage(d.locale)}</p>
        </>
      ),
    },
    {
      key: 'version',
      label: 'Version',
      render: (d) => (
        <>
          <span className="mono">v{d.version}</span>
          {d.isCurrent ? (
            d.requiresReacceptance && (
              <p className="text-2xs font-medium text-warn-fg">Customers must accept again</p>
            )
          ) : (
            <p className="mt-0.5">
              <Badge tone="neutral" icon="file">
                Draft
              </Badge>
            </p>
          )}
        </>
      ),
    },
    {
      key: 'since',
      label: 'In force since',
      hide: 'sm',
      render: (d) => <span className="text-ink2">{fmtDay(d.effectiveFrom) || '–'}</span>,
    },
    {
      key: 'accepted',
      label: 'Accepted at checkout',
      num: true,
      hide: 'md',
      render: (d) =>
        d.acceptedCount ? `${num(d.acceptedCount)} times` : <span className="text-ink3">Not asked</span>,
    },
    {
      key: 'actions',
      label: '',
      render: (d) => {
        const name = `${legalTypeLabel(d.type)} v${d.version} (${legalLanguage(d.locale)})`;
        return d.isCurrent ? (
          <Button
            size="sm"
            disabled={createLock.disabled}
            title={createLock.title}
            aria-label={`New version of ${name}`}
            onClick={() => onNewVersion(d)}
          >
            New version…
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            disabled={publishLock.disabled}
            title={publishLock.title}
            aria-label={`Publish ${name}`}
            onClick={() => onPublish(d)}
          >
            Publish…
          </Button>
        );
      },
    },
  ];

  return (
    <DataTable
      caption="Legal documents"
      columns={columns}
      rows={rows}
      rowKey={(d) => d.id}
      state={state}
      error={error}
      errorTitle="Could not load the legal documents"
      onRetry={onRetry}
      empty={
        <EmptyState icon="scale" title="No legal documents">
          Publish terms, privacy and refund policy before taking public orders.
        </EmptyState>
      }
    />
  );
}
