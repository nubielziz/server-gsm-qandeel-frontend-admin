// PhoneField: the phone box of a form (decision 040: the same field as the shop's website). One text box (the value is the string as
// typed), with a button at its start that shows the flag of the number's country and opens the list of calling codes (CountryList: search
// by name or by code). The flag follows what is typed: `+962…` or `00962…` shows Jordan, a local number or an empty box shows a globe.
// Choosing a country writes its calling code before the number (`withCountry`) and puts the caret back in the box. Where countries share a
// code (+1, +7, +44) and the number cannot tell yet, the country chosen in this list decides, else `countryHint` (the form's country).
// Nothing is checked here and no digit is rewritten: the form and the server judge the number.
// It is controlled: with react-hook-form, give it the `field` of `useController` (`value`, `onValueChange={field.onChange}`, `onBlur`,
// `name` and `ref`; the ref is the input).
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react';
import { dialCountryRows, dialLabel, phoneCountry, typedPhone, withCountry } from '@/lib/phone/dial';
import { CountryList } from './CountryList';
import { cx } from './cx';
import { FieldFrame } from './FieldFrame';
import { describedBy, errorMessage, INVALID_BORDER, type FieldErrorLike } from './fieldA11y';
import { Flag } from './Flag';
import { FloatingPanel } from './FloatingPanel';
import { Icon } from './Icon';
import { usePopover } from './usePopover';

export interface PhoneFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'dir' | 'value' | 'onChange'
> {
  label: ReactNode;
  hint?: ReactNode;
  error?: FieldErrorLike;
  /** Classes for the wrapper (width, grid placement). */
  wrapperClassName?: string;
  /** `row`: the label in a column at the left of the control. Default `stacked`: above it. */
  layout?: 'stacked' | 'row';
  /** The number as typed. */
  value: string;
  onValueChange: (value: string) => void;
  /** The country chosen elsewhere in the form (an ISO code): it breaks the tie between countries that share a calling code. */
  countryHint?: string;
}

/** A phone box with a flag and a list of calling codes. The ref goes to the input. */
export const PhoneField = forwardRef<HTMLInputElement, PhoneFieldProps>(function PhoneField(
  {
    label,
    hint,
    error,
    wrapperClassName,
    layout,
    className,
    id,
    value,
    onValueChange,
    countryHint,
    disabled,
    ...rest
  },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const buttonId = `${fieldId}-code`;
  const listId = `${fieldId}-list`;
  const message = errorMessage(error);
  const pop = usePopover();
  const input = useRef<HTMLInputElement | null>(null);
  // The country last chosen in the list: the first tie-breaker of a shared calling code.
  const [picked, setPicked] = useState<string | null>(null);

  const country = phoneCountry(value, picked ?? countryHint);
  const code = country ? dialLabel(country) : null;

  // Counts the choices made in the list: after each one is drawn, the caret goes to the end of the box, ready for the number.
  const [chosen, setChosen] = useState(0);
  useEffect(() => {
    const box = input.current;
    if (chosen === 0 || !box) return;
    box.focus();
    box.setSelectionRange(box.value.length, box.value.length);
  }, [chosen]);

  function choose(next: string) {
    setPicked(next);
    onValueChange(withCountry(value, next));
    pop.close();
    setChosen((count) => count + 1);
  }

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      hint={hint}
      error={message}
      className={wrapperClassName}
      layout={layout}
      required={rest.required}
    >
      <span
        ref={pop.anchorRef}
        dir="ltr"
        className={cx('relative flex items-center', layout === 'row' && 'row-control')}
      >
        <button
          type="button"
          id={buttonId}
          aria-label={code ? `Country calling code: ${code}` : 'Country calling code'}
          aria-haspopup="listbox"
          aria-expanded={pop.open}
          aria-controls={pop.open ? listId : undefined}
          disabled={disabled}
          className="absolute inset-y-px start-px z-[1] flex w-11 items-center justify-center gap-1 rounded-s-[5px] border-e border-line2 text-ink3 transition-colors hover:bg-hover disabled:pointer-events-none"
          onClick={pop.toggle}
        >
          <Flag code={country ?? ''} />
          <Icon name="chevD" className="ic-xs" />
        </button>
        <input
          inputMode="tel"
          autoComplete="off"
          {...rest}
          ref={(element) => {
            input.current = element;
            if (typeof ref === 'function') ref(element);
            else if (ref) ref.current = element;
          }}
          id={fieldId}
          type="text"
          dir="ltr"
          disabled={disabled}
          className={cx('input ps-[3.25rem]', INVALID_BORDER, className)}
          aria-invalid={message ? true : undefined}
          aria-describedby={describedBy(fieldId, Boolean(hint), Boolean(message))}
          value={value}
          onChange={(event) => onValueChange(typedPhone(value, event.target.value))}
        />
        <FloatingPanel
          {...pop.panelProps}
          align="start"
          className="menu overflow-hidden !p-0"
          style={{ width: 288 }}
        >
          <CountryList
            id={listId}
            labelledBy={buttonId}
            rows={dialCountryRows()}
            selected={country ?? undefined}
            onSelect={choose}
            onTab={() => {
              input.current?.focus();
              pop.close();
            }}
          />
        </FloatingPanel>
      </span>
    </FieldFrame>
  );
});
