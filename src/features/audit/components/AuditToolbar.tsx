// AuditToolbar: the search box, the "who" and record-type filters, the date range, Clear filters and the live entry count
// above the audit list. Ports the `toolbar` of pageAudit in 47-p-audit.js (the date range is new). The search text is sent
// after a pause.
import { Button, SearchInput, SelectField, TableToolbar, useDebouncedCommit } from '@/components/ui';
import { num } from '@/lib/format';
import type { AuditActor } from '../hooks/useAuditActors';
import { ENTITY_KINDS, entityTypeLabel } from '../lib/entities';
import { hasFilters, SYSTEM_ACTOR, type AuditView } from '../lib/view';

export interface AuditToolbarProps {
  view: AuditView;
  /** The staff accounts the "who" filter offers; empty when the staff member may not read them. */
  actors: readonly AuditActor[];
  onChange: (patch: Partial<AuditView>) => void;
  onClear: () => void;
  /** The number of entries that match, from the server. */
  total: number | undefined;
}

// Everyone, the system, then each person with their role ("Lina S. (Support)"), as the demo's actor list.
function actorOptions(view: AuditView, actors: readonly AuditActor[]) {
  const options = [
    { value: '', label: 'Everyone' },
    { value: SYSTEM_ACTOR, label: 'System' },
    ...actors.map((actor) => ({ value: String(actor.id), label: `${actor.name} (${actor.role})` })),
  ];
  // A link can name a person the list does not hold (an account that was removed, or one the role cannot read).
  const known = options.some((option) => option.value === view.actor);
  return known ? options : [...options, { value: view.actor, label: `Staff #${view.actor}` }];
}

// All records, then the record types by name. A type from the address that is not in the list is added so it shows.
function typeOptions(view: AuditView) {
  const kinds = view.type && !ENTITY_KINDS.includes(view.type) ? [...ENTITY_KINDS, view.type] : ENTITY_KINDS;
  const named = kinds
    .map((kind) => ({ value: kind, label: entityTypeLabel(kind) }))
    .sort((a, b) => a.label.localeCompare(b.label));
  return [{ value: '', label: 'All records' }, ...named];
}

export function AuditToolbar({ view, actors, onChange, onClear, total }: AuditToolbarProps) {
  const search = useDebouncedCommit(view.q, (q) => onChange({ q }));
  return (
    <TableToolbar
      count={total === undefined ? undefined : `${num(total)} ${total === 1 ? 'entry' : 'entries'}`}
    >
      <SearchInput
        value={search.text}
        onChange={search.setText}
        placeholder="Search person, action, record"
      />
      <SelectField
        aria-label="Filter by person"
        value={view.actor}
        options={actorOptions(view, actors)}
        onChange={(event) => onChange({ actor: event.target.value })}
      />
      <SelectField
        aria-label="Filter by record type"
        value={view.type}
        options={typeOptions(view)}
        onChange={(event) => onChange({ type: event.target.value })}
      />
      {/* A range that runs backwards cannot be typed: each date limits the other. */}
      <input
        type="date"
        className="input w-[9.5rem]"
        aria-label="From date"
        value={view.from}
        max={view.to || undefined}
        onChange={(event) => onChange({ from: event.target.value })}
      />
      <input
        type="date"
        className="input w-[9.5rem]"
        aria-label="To date"
        value={view.to}
        min={view.from || undefined}
        onChange={(event) => onChange({ to: event.target.value })}
      />
      {hasFilters(view) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </TableToolbar>
  );
}
