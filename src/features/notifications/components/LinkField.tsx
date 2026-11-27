// LinkField: the link of the campaign message for one kind of person, as a menu (decision 036): no link, a page of the console or of the shop's
// account area, or "Another page…", which shows the text box for any other path (the same site-path check as before). A link the menu does
// not know shows as "Another page…" with its text.
import { useState } from 'react';
import { SelectField, TextField } from '@/components/ui';
import { ANOTHER_PAGE, isKnownPage, linkOptions, startsAsAnotherPage } from '../lib/links';
import type { LinkKey } from '../lib/spec';

export interface LinkFieldProps {
  linkKey: LinkKey;
  /** The label of the menu, such as "Link for staff". */
  label: string;
  /** The label of the text box, such as "Page address for staff". */
  boxLabel: string;
  placeholder: string;
  /** The path as the form holds it: empty is no link. */
  value: string;
  /** The message about the path (the client check or the server's). */
  error?: string;
  onChange: (value: string) => void;
}

/** The menu of pages, plus the text box once "Another page…" is chosen or the stored link is not a known page. */
export function LinkField({ linkKey, label, boxLabel, placeholder, value, error, onChange }: LinkFieldProps) {
  // "Another page…" is a mode of its own: an empty box must not jump back to "No link" while it is open.
  const [typed, setTyped] = useState(() => startsAsAnotherPage(linkKey, value));
  const picked = typed ? ANOTHER_PAGE : isKnownPage(linkKey, value) ? value : '';
  return (
    <div className="space-y-2">
      <SelectField
        label={label}
        selectWrapClassName="w-full"
        options={linkOptions(linkKey)}
        value={picked}
        hint={typed || value === '' ? undefined : `A click opens ${value}.`}
        error={typed ? undefined : error}
        onChange={(event) => {
          const next = event.target.value;
          if (next === ANOTHER_PAGE) {
            // A page picked from the list is not what "Another page" means: the box starts empty.
            if (!typed) onChange('');
            setTyped(true);
            return;
          }
          setTyped(false);
          onChange(next);
        }}
      />
      {typed && (
        <TextField
          label={boxLabel}
          placeholder={placeholder}
          hint="A path on the site that starts with one /, no address."
          value={value}
          error={error}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}
