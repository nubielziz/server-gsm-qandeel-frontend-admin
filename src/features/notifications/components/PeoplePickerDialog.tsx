// PeoplePickerDialog: picks individual people to add to the audience or to leave out of it. Tabs for staff and accounts (a tab is hidden when
// the role cannot read that list), a search, and a paged table with a tick box per row. The ticks stay while the page, the search or the tab changes (the
// picked people are kept in one map). Built on the mechanics of the suppliers' ImportPicker.
import { useMemo, useState } from 'react';
import {
  DataTable,
  EmptyState,
  FormDialog,
  SearchInput,
  Tabs,
  type DataTableColumn,
  type RowSelection,
} from '@/components/ui';
import { usePeople } from '../hooks/usePeople';
import { PEOPLE_PAGE_SIZE } from '../hooks/keys';
import { useSettledValue } from '../hooks/useSettledValue';
import { MAX_PEOPLE, PERSON_WORD, type PickedPerson } from '../lib/spec';
import type { PersonType } from '../types';

const TAB_LABEL: Record<PersonType, string> = { staff: 'Staff', account: 'Accounts' };

const COLUMNS: DataTableColumn<PickedPerson>[] = [
  { key: 'name', label: 'Name', render: (person) => <span className="font-medium">{person.name}</span> },
  {
    key: 'rank',
    label: 'Rank',
    hide: 'sm',
    render: (person) => <span className="text-ink2">{person.rank?.name}</span>,
  },
  {
    key: 'detail',
    label: 'Email',
    hide: 'sm',
    render: (person) => <span className="text-ink2">{person.detail}</span>,
  },
];

const keyOf = (person: Pick<PickedPerson, 'type' | 'id'>) => `${person.type}:${person.id}`;

export interface PeoplePickerDialogProps {
  /** `include` adds people to the audience, `exclude` leaves them out of it. */
  mode: 'include' | 'exclude';
  /** The people already on that list: they start ticked. */
  initial: readonly PickedPerson[];
  /** The kinds of people the role may list. */
  types: readonly PersonType[];
  onClose: () => void;
  /** Gets the whole picked list when the staff member presses Done. */
  onConfirm: (people: PickedPerson[]) => void;
}

/** The dialog is mounted only while it is open, so every opening starts from `initial`. */
export function PeoplePickerDialog({ mode, initial, types, onClose, onConfirm }: PeoplePickerDialogProps) {
  const [type, setType] = useState<PersonType>(types[0] ?? 'staff');
  const [text, setText] = useState('');
  const [page, setPage] = useState(1);
  const [picked, setPicked] = useState(() => new Map(initial.map((person) => [keyOf(person), person])));
  const q = useSettledValue(text.trim(), 300);
  const list = usePeople({ type, q, page });

  // A DataTable selection over the picked map, for the rows of the open tab. Rows are looked up on the page on screen: only visible rows can be ticked.
  const selection = useMemo<RowSelection<number>>(() => {
    const change = (ids: readonly number[], on: boolean) =>
      setPicked((prev) => {
        const next = new Map(prev);
        for (const id of ids) {
          const row = list.rows.find((candidate) => candidate.id === id);
          if (on && row) next.set(keyOf(row), row);
          if (!on) next.delete(keyOf({ type, id }));
        }
        return next;
      });
    const ids = new Set(
      [...picked.values()].filter((person) => person.type === type).map((person) => person.id),
    );
    return {
      selected: ids,
      has: (id) => ids.has(id),
      toggle: (id, on) => change([id], on ?? !ids.has(id)),
      setMany: change,
      clear: () => setPicked((prev) => new Map([...prev].filter(([, person]) => person.type !== type))),
    };
  }, [picked, type, list.rows]);

  const countOf = (kind: PersonType) => [...picked.values()].filter((person) => person.type === kind).length;
  const over = picked.size > MAX_PEOPLE;
  const verb = mode === 'include' ? 'Add people' : 'Leave out people';

  return (
    <FormDialog
      open
      size="lg"
      title={verb}
      sub={
        mode === 'include'
          ? 'These people are reached even when no group above includes them.'
          : 'These people are left out, whatever the groups above say.'
      }
      confirm="Done"
      onClose={onClose}
      onSubmit={() => {
        if (over) return `Pick at most ${MAX_PEOPLE} people.`;
        onConfirm([...picked.values()]);
      }}
    >
      <div className="space-y-3">
        <Tabs
          label="Kind of person"
          items={types.map((kind) => ({ value: kind, label: TAB_LABEL[kind], count: countOf(kind) }))}
          value={type}
          onChange={(next) => {
            setType(next);
            setPage(1);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={text}
            onChange={(value) => {
              setText(value);
              setPage(1);
            }}
            placeholder={`Search ${TAB_LABEL[type].toLowerCase()}`}
            // Enter must not submit the dialog's form.
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
          />
          <span className="ms-auto text-xs text-ink3" aria-live="polite">
            {picked.size} picked
          </span>
        </div>
        <div className="max-h-[360px] overflow-auto rounded-md border border-line">
          <DataTable
            caption={TAB_LABEL[type]}
            columns={COLUMNS}
            rows={list.rows}
            rowKey={(person) => person.id}
            selection={selection}
            state={list.query.isLoading ? 'loading' : list.query.isError ? 'error' : 'ready'}
            error={list.query.error}
            errorTitle={`Could not load the ${TAB_LABEL[type].toLowerCase()}`}
            onRetry={() => void list.query.refetch()}
            pagination={{ page, pageSize: PEOPLE_PAGE_SIZE, total: list.total ?? 0 }}
            onPageChange={setPage}
            skeletonRows={5}
            footer={false}
            empty={
              <EmptyState icon="inbox" title={`No ${PERSON_WORD[type].toLowerCase()} found`}>
                {q ? 'Nobody matches the search.' : 'Nothing to pick here yet.'}
              </EmptyState>
            }
          />
        </div>
      </div>
    </FormDialog>
  );
}
