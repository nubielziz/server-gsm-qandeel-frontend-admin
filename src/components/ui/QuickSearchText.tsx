// QuickSearchText: the text of a Quick Search box with its Search button ([Search service from any group] [Search]). The text is a draft until
// Search or Enter, so a list is not read again at every key; Enter never submits a form the box sits in.
import { Button } from './Button';
import { SearchInput } from './SearchInput';

export interface QuickSearchTextProps {
  value: string;
  onChange: (value: string) => void;
  /** Search or Enter: apply the text. */
  onSearch: () => void;
  /** Also the box's accessible name. */
  placeholder: string;
  /** Classes for the box's wrapper (a minimum width). */
  className?: string;
}

/** The search box and its button, side by side in the LegendBox row. */
export function QuickSearchText({ value, onChange, onSearch, placeholder, className }: QuickSearchTextProps) {
  return (
    <>
      <SearchInput
        className={className}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          onSearch();
        }}
      />
      <Button onClick={onSearch}>Search</Button>
    </>
  );
}
