// ServiceSearchField: the Service field of the Add listing dialog, a search box over the active IMEI services. The staff member
// types part of a name, a code or a category, the server answers the matches (20 at a time), and a click or Enter picks one.
// New in feature 30: it replaces a select capped at 200 names, which hid most services after a supplier's Quick add.
import { forwardRef, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cx } from '@/components/ui';
import { FieldFrame } from '@/components/ui/FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from '@/components/ui/fieldA11y';
import type { Service } from '@/features/services';
import { useServiceSearch } from '../hooks/useServiceSearch';
import { ServiceSearchList } from './ServiceSearchList';

export interface ServiceSearchFieldProps {
  /** The chosen service, or null while none is. */
  value: Service | null;
  /** Called with the picked service, and with null when the staff member types again after a pick. */
  onChange: (service: Service | null) => void;
  onBlur?: () => void;
  /** A message or a react-hook-form FieldError (a missing choice, or the server's refusal of the service). */
  error?: FieldErrorLike;
}

/** What the box shows for a chosen service: the same words as its option. */
const labelOf = (service: Service) => `${service.name} (${service.code})`;

/**
 * A combobox: the input keeps the focus the whole time, the arrows move through the options, Enter picks, Escape closes
 * the list without closing the dialog. The list opens on typing, on an arrow key and on a click, not when the dialog
 * puts the focus here, so the dialog opens with its other fields in view. The ref goes to the input, so react-hook-form
 * can focus the field when no service was chosen.
 */
export const ServiceSearchField = forwardRef<HTMLInputElement, ServiceSearchFieldProps>(
  function ServiceSearchField({ value, onChange, onBlur, error }, ref) {
    const id = useId();
    const listId = `${id}-list`;
    const optionId = (index: number) => `${id}-option-${index}`;
    const input = useRef<HTMLInputElement | null>(null);
    const [text, setText] = useState('');
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(0);
    // A chosen service is not a search text: opening the list again offers the first services by name.
    const { query, q, settling } = useServiceSearch(value ? '' : text, open);
    const rows = query.data?.data ?? [];
    const searching = settling || query.isFetching;
    // No option is active while an answer is on its way: Enter must never pick a row of the text before.
    const active = searching ? -1 : Math.min(cursor, rows.length - 1);
    const activeId = open && active >= 0 ? optionId(active) : undefined;
    const message = errorMessage(error);

    useEffect(() => {
      if (activeId) document.getElementById(activeId)?.scrollIntoView?.({ block: 'nearest' });
    }, [activeId]);

    // After a pick the whole name is selected, so the next keystroke starts a new search instead of adding to the name.
    useEffect(() => {
      if (value && document.activeElement === input.current) input.current?.select();
    }, [value]);

    function pick(service: Service) {
      onChange(service);
      setText(labelOf(service));
      setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        if (!open) {
          setOpen(true);
          setCursor(0);
        } else if (active >= 0) {
          setCursor(
            event.key === 'ArrowDown' ? Math.min(rows.length - 1, active + 1) : Math.max(0, active - 1),
          );
        }
      } else if (event.key === 'Enter' && open) {
        // While the list is open Enter belongs to it: it picks the active option and never sends the form.
        event.preventDefault();
        const service = rows[active];
        if (service) pick(service);
      } else if (event.key === 'Escape' && open) {
        // Close the list only: the dialog around the field must not take this Escape as its own.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
      }
    }

    return (
      <FieldFrame
        id={id}
        label="Service"
        hint="Only active IMEI services are sold to the public."
        error={message}
      >
        <div className="relative">
          <input
            ref={(element) => {
              input.current = element;
              if (typeof ref === 'function') ref(element);
              else if (ref) ref.current = element;
            }}
            id={id}
            className={cx('input', INVALID_BORDER)}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            aria-invalid={message ? true : undefined}
            aria-describedby={describedBy(id, true, Boolean(message))}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search by name, code or category"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              // Typing after a pick drops the pick: the box no longer names that service.
              if (value) onChange(null);
              setOpen(true);
              setCursor(0);
            }}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            onBlur={() => {
              setOpen(false);
              onBlur?.();
            }}
          />
          <ServiceSearchList
            listId={listId}
            open={open}
            rows={rows}
            total={query.data?.total ?? 0}
            active={active}
            optionId={optionId}
            searching={searching}
            error={query.isError ? query.error : null}
            q={q}
            onPick={pick}
            onRetry={() => void query.refetch()}
          />
        </div>
      </FieldFrame>
    );
  },
);
