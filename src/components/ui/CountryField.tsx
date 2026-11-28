// CountryField: the country menu of a form or a toolbar, in place of a native select (decision 040, the owner's request of 2026-11-28: the
// same field as the shop's website). A button shows the chosen country with its flag; it opens a panel with a search box and the list
// (CountryList), so a person types a few letters instead of scrolling some 250 names. It takes the options of a SelectField (`value` is the
// two-letter code; an option with an empty value is the choice that means "none", such as "Any country") and the same label, hint, error
// and layout props. It is controlled: with react-hook-form, give it the `field` of `useController` (`value`, `onValueChange={field.onChange}`,
// `onBlur`, `name` and `ref`; the ref is the button, so the first invalid field can take the focus).
// Keyboard: Enter, Space or an arrow opens the list; a letter opens it with that letter in the search box; Escape closes it.
import { forwardRef, useId, useState, type KeyboardEvent, type ReactNode } from 'react';
import { CountryList } from './CountryList';
import { cx } from './cx';
import { FieldFrame } from './FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from './fieldA11y';
import { Flag } from './Flag';
import { FloatingPanel } from './FloatingPanel';
import { Icon } from './Icon';
import type { SelectOption } from './SelectField';
import { usePopover } from './usePopover';

export interface CountryFieldProps {
  /** The choices: `value` is an ISO 3166-1 alpha-2 code, or empty for the choice that means "none". */
  options: readonly SelectOption[];
  /** The chosen code, or empty. */
  value: string;
  onValueChange: (code: string) => void;
  onBlur?: () => void;
  name?: string;
  id?: string;
  /** Visible label. Without it (a toolbar filter) give the field an `aria-label`. */
  label?: ReactNode;
  hint?: ReactNode;
  error?: FieldErrorLike;
  /** Classes for the outer wrapper when there is a label. */
  wrapperClassName?: string;
  /** Classes for the span around the button, for example `w-full` or `sm:w-48` (the name SelectField gives the same prop). */
  selectWrapClassName?: string;
  /** `row`: the label in a column at the left of the control. Default `stacked`: above it, and no frame at all without a label. */
  layout?: 'stacked' | 'row';
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  title?: string;
  'aria-label'?: string;
}

/** A searchable country menu with flags. The ref goes to the button. */
export const CountryField = forwardRef<HTMLButtonElement, CountryFieldProps>(function CountryField(
  {
    options,
    value,
    onValueChange,
    onBlur,
    name,
    id,
    label,
    hint,
    error,
    wrapperClassName,
    selectWrapClassName,
    layout = 'stacked',
    required,
    disabled,
    autoFocus,
    title,
    'aria-label': ariaLabel,
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const listId = `${fieldId}-list`;
  const message = errorMessage(error);
  const pop = usePopover();
  const anchor = pop.panelProps.anchor;
  // The letter that opened the panel from the keyboard: the search box starts with it.
  const [seed, setSeed] = useState('');

  const chosen = options.find((option) => String(option.value) === value);
  const rows = options.map((option) => ({ code: String(option.value), name: option.label }));

  function open(letter = '') {
    setSeed(letter);
    if (!pop.open) pop.toggle();
  }

  function choose(code: string) {
    pop.close();
    anchor?.focus();
    if (code !== value) onValueChange(code);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (pop.open) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
    } else if (
      event.key.length === 1 &&
      event.key !== ' ' &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      // A letter typed on the closed button starts a search, as typing on a native select jumps to a name.
      event.preventDefault();
      open(event.key);
    }
  }

  const control = (
    <span className={cx('relative inline-flex min-w-[11rem]', selectWrapClassName)}>
      <button
        ref={(element) => {
          pop.anchorRef(element);
          if (typeof ref === 'function') ref(element);
          else if (ref) ref.current = element;
        }}
        type="button"
        id={fieldId}
        name={name}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={pop.open}
        aria-controls={pop.open ? listId : undefined}
        aria-label={ariaLabel}
        aria-invalid={message ? true : undefined}
        aria-required={required || undefined}
        aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
        data-value={value}
        disabled={disabled}
        autoFocus={autoFocus}
        // A dialog of the kit gives the focus to the field marked this way (dialog.ts): a button is not one of the fields it looks for.
        data-autofocus={autoFocus || undefined}
        title={title}
        className={cx(
          'input flex cursor-pointer items-center gap-2 text-start disabled:cursor-not-allowed disabled:opacity-60',
          INVALID_BORDER,
        )}
        onClick={() => (pop.open ? pop.close() : open())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      >
        {/* A code the options do not hold (a saved country the menu lost) is still shown, by its code. */}
        {(chosen ? chosen.value !== '' : value !== '') && <Flag code={value} />}
        <span className="min-w-0 flex-1 truncate">{chosen ? chosen.label : value}</span>
        <Icon name="chevD" className="ic-sm flex-none text-ink3" />
      </button>
      <FloatingPanel
        {...pop.panelProps}
        align="start"
        className="menu overflow-hidden !p-0"
        style={{ width: Math.max(anchor?.offsetWidth ?? 0, 256) }}
      >
        <CountryList
          id={listId}
          labelledBy={fieldId}
          rows={rows}
          selected={value}
          initialQuery={seed}
          onSelect={choose}
          onTab={() => {
            anchor?.focus();
            pop.close();
          }}
        />
      </FloatingPanel>
    </span>
  );
  if (layout === 'stacked' && !label && !hint && !message) return control;
  return (
    <FieldFrame
      id={fieldId}
      label={label}
      hint={hint}
      error={message}
      className={wrapperClassName}
      layout={layout}
      required={required}
    >
      {control}
    </FieldFrame>
  );
});
