// ReportTerms: the two tables of the search report: the most searched terms and the searches that found nothing, each row with
// the actions that fix it (Hide from popular; Add synonym… and Pin services… for a no-result search). It draws what it is given.
// A term that looks like personal data is never printed or acted on: the server does not store those, and this is the second guard.
// Such a row has no action buttons at all, so the term is not in a label or the DOM either.
import { Badge, Button, DataTable, type DataTableColumn } from '@/components/ui';
import { ago, fmtDate, num, pct } from '@/lib/format';
import { looksPersonal } from '../../lib/search';
import type { ReportTerm, ZeroResultTerm } from '../../types';

/** The props of the buttons that need `storefront:update`. */
type Lock = { disabled: boolean; title?: string };

export interface ReportTermsProps {
  top: readonly ReportTerm[];
  zero: readonly ZeroResultTerm[];
  /** Terms already hidden from the popular searches (lower case). */
  hiddenTerms: ReadonlySet<string>;
  lock: Lock;
  onHide: (term: string) => void;
  onSynonym: (term: string) => void;
  onPin: (term: string) => void;
}

/** A term in mono, or a quiet note when it looks personal. */
function TermCell({ term }: { term: string }) {
  return looksPersonal(term) ? (
    <span className="italic text-ink3">Hidden: looks like personal data</span>
  ) : (
    <span className="mono">{term}</span>
  );
}

function HideButton({
  term,
  hidden,
  lock,
  onHide,
}: {
  term: string;
  hidden: boolean;
  lock: Lock;
  onHide: (t: string) => void;
}) {
  // No button for a personal term: its label would put the term back into the page and to screen readers.
  if (looksPersonal(term)) return null;
  if (hidden) return <Badge tone="neutral">Hidden from popular</Badge>;
  return (
    <Button
      size="sm"
      disabled={lock.disabled}
      title={lock.title}
      aria-label={`Hide ${term} from popular searches`}
      onClick={() => onHide(term)}
    >
      Hide from popular
    </Button>
  );
}

/** The most searched terms. */
export function TopTermsTable({
  top,
  hiddenTerms,
  lock,
  onHide,
}: Pick<ReportTermsProps, 'top' | 'hiddenTerms' | 'lock' | 'onHide'>) {
  const columns: DataTableColumn<ReportTerm>[] = [
    { key: 'term', label: 'Search', render: (row) => <TermCell term={row.term} /> },
    { key: 'searches', label: 'Searches', num: true, render: (row) => num(row.searches) },
    { key: 'visitors', label: 'Visitors', num: true, hide: 'sm', render: (row) => num(row.visitors) },
    {
      key: 'zero',
      label: 'Found nothing',
      num: true,
      hide: 'sm',
      render: (row) =>
        row.zeroResults > 0
          ? `${num(row.zeroResults)} (${pct((row.zeroResults / row.searches) * 100, 0)})`
          : '–',
    },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex justify-end">
          <HideButton term={row.term} hidden={hiddenTerms.has(row.term)} lock={lock} onHide={onHide} />
        </div>
      ),
    },
  ];
  return (
    <DataTable
      caption="Top searches"
      columns={columns}
      rows={top}
      rowKey={(row) => row.term}
      empty={<NoSearches />}
    />
  );
}

function NoSearches() {
  return <p className="px-3.5 py-6 text-center text-sm text-ink2">No searches in this range yet.</p>;
}

/** The searches that found nothing, most frequent first. */
export function ZeroTermsTable({
  zero,
  hiddenTerms,
  lock,
  onHide,
  onSynonym,
  onPin,
}: Omit<ReportTermsProps, 'top'>) {
  const columns: DataTableColumn<ZeroResultTerm>[] = [
    { key: 'term', label: 'Search', render: (row) => <TermCell term={row.term} /> },
    { key: 'searches', label: 'Searches', num: true, render: (row) => num(row.searches) },
    {
      key: 'last',
      label: 'Last searched',
      hide: 'sm',
      render: (row) => (
        <span className="whitespace-nowrap text-ink2" title={fmtDate(row.lastSeen)}>
          {ago(row.lastSeen)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (row) => {
        if (looksPersonal(row.term)) return null;
        return (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button
              size="sm"
              disabled={lock.disabled}
              title={lock.title}
              aria-label={`Add a synonym for ${row.term}`}
              onClick={() => onSynonym(row.term)}
            >
              Add synonym…
            </Button>
            <Button
              size="sm"
              disabled={lock.disabled}
              title={lock.title}
              aria-label={`Pin services for ${row.term}`}
              onClick={() => onPin(row.term)}
            >
              Pin services…
            </Button>
            <HideButton term={row.term} hidden={hiddenTerms.has(row.term)} lock={lock} onHide={onHide} />
          </div>
        );
      },
    },
  ];
  return (
    <DataTable
      caption="Searches with no result"
      columns={columns}
      rows={zero}
      rowKey={(row) => row.term}
      empty={
        <p className="px-3.5 py-6 text-center text-sm text-ink2">
          Every search in this range found something.
        </p>
      }
    />
  );
}
