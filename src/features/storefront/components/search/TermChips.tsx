// TermChips: a box that turns typed words and phrases into removable chips (the terms of a synonym rule). Enter, a comma or leaving
// the box adds what is typed; text is cleaned the way the server cleans it (lower case, one space between words), so a repeat is
// ignored at once. New in the Search tab; the demo had no such field.
import { useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { cx, Icon, type FieldErrorLike } from '@/components/ui';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { describedBy, errorMessage } from '@/components/ui/fieldA11y';
import { addTerms } from '../../lib/search';

export interface TermChipsProps {
  label: ReactNode;
  value: readonly string[];
  onChange: (terms: string[]) => void;
  hint?: ReactNode;
  error?: FieldErrorLike;
  placeholder?: string;
  autoFocus?: boolean;
}

/** A controlled list of terms with its own input. Backspace in an empty box removes the last chip. */
export function TermChips({ label, value, onChange, hint, error, placeholder, autoFocus }: TermChipsProps) {
  const id = useId();
  const [text, setText] = useState('');
  const message = errorMessage(error);

  const commit = () => {
    if (text.trim()) onChange(addTerms(value, text));
    setText('');
  };
  const remove = (term: string) => onChange(value.filter((item) => item !== term));

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      // Enter must not submit the dialog's form while terms are being typed.
      event.preventDefault();
      commit();
    } else if (event.key === 'Backspace' && text === '' && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <FieldFrame id={id} label={label} hint={hint} error={message}>
      <div
        className={cx(
          'flex min-h-8 w-full flex-wrap items-center gap-1.5 rounded-md border border-line2 bg-surface px-2 py-1 transition-colors',
          'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30',
          message && 'border-crit-dot',
        )}
      >
        {value.map((term) => (
          <span key={term} className="chip">
            {term}
            <button
              type="button"
              className="text-ink3 hover:text-ink"
              aria-label={`Remove ${term}`}
              onClick={() => remove(term)}
            >
              <Icon name="x" className="ic-xs" />
            </button>
          </span>
        ))}
        <input
          id={id}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm text-ink outline-none placeholder:text-ink3"
          value={text}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={value.length === 0 ? placeholder : undefined}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(id, Boolean(hint), Boolean(message))}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commit}
        />
      </div>
    </FieldFrame>
  );
}
