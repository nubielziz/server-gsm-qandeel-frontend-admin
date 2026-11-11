// PeopleList: the people added to (or left out of) the audience, as removable rows with a count, and the button that opens the picker.
import { Button, Icon } from '@/components/ui';
import { PERSON_WORD, type PickedPerson } from '../lib/spec';

export interface PeopleListProps {
  title: string;
  /** What the list is for, one line ("Reached even when they are outside the groups above."). */
  help: string;
  people: readonly PickedPerson[];
  addLabel: string;
  /** Why the button is disabled (the role cannot read any list of people), or undefined. */
  blocked?: string;
  error?: string;
  onAdd: () => void;
  onRemove: (person: PickedPerson) => void;
}

export function PeopleList({
  title,
  help,
  people,
  addLabel,
  blocked,
  error,
  onAdd,
  onRemove,
}: PeopleListProps) {
  return (
    <section aria-label={title} className="rounded-md border border-line2">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {title} <span className="count">{people.length}</span>
          </p>
          <p className="text-xs text-ink3">{help}</p>
        </div>
        <Button size="sm" onClick={onAdd} disabled={blocked !== undefined} title={blocked}>
          <Icon name="plus" className="ic-sm" />
          {addLabel}
        </Button>
      </div>
      {people.length > 0 && (
        <ul className="max-h-48 divide-y divide-line overflow-auto border-t border-line">
          {people.map((person) => (
            <li key={`${person.type}:${person.id}`} className="flex items-center gap-2 px-3 py-1.5 text-sm">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{person.name}</span>
                <span className="ms-2 text-xs text-ink3">
                  {PERSON_WORD[person.type]}
                  {person.detail ? `, ${person.detail}` : ''}
                </span>
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon
                aria-label={`Remove ${person.name}`}
                onClick={() => onRemove(person)}
              >
                <Icon name="x" className="ic-sm" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="border-t border-line p-3 text-xs text-crit-fg">{error}</p>}
    </section>
  );
}
