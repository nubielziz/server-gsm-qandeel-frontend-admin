// SearchInput: search box with a leading icon. Ports searchEl(key, value, placeholder) of 20-ui.js.
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cx } from './cx';
import { Icon } from './Icon';

export interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'placeholder'
> {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Wrapper classes, for example a different max width. */
  className?: string;
}

/**
 * `data-fk` marks the field the "/" shortcut focuses. The placeholder doubles as the accessible name
 * unless an aria-label is given.
 */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  { value, onChange, placeholder, className, ...rest },
  ref,
) {
  return (
    <div className={cx('relative min-w-[180px] flex-1 sm:max-w-[280px]', className)}>
      <span className="pointer-events-none absolute inset-y-0 start-2.5 flex items-center text-ink3">
        <Icon name="search" className="ic-sm" />
      </span>
      <input
        ref={ref}
        className="input ps-8"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        data-fk=""
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      />
    </div>
  );
});
